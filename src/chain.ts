import {
  createPublicClient, createWalletClient, custom, encodeFunctionData, fallback,
  getAddress, http, isAddress, isAddressEqual, parseAbi, parseEventLogs, zeroAddress,
  type Address, type EIP1193Provider, type Hex, type TransactionReceipt,
} from 'viem'
import { bsc } from 'viem/chains'

const testMode = import.meta.env.MODE === 'localchain'
export const chain = testMode ? { ...bsc, id: 31337, name: 'Local chain' } : bsc
const configured = import.meta.env.VITE_CONTRACT_ADDRESS ?? ''
export const deployment = isAddress(configured) && configured !== zeroAddress ? getAddress(configured) : undefined
export const agentId = testMode && isAddress(import.meta.env.VITE_AGENT_ID_ADDRESS ?? '')
  ? getAddress(import.meta.env.VITE_AGENT_ID_ADDRESS)
  : '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F'
export const explorer = bsc.blockExplorers.default.url
const rpc = import.meta.env.VITE_BSC_RPC_URL
const endpoints = testMode ? [rpc || 'http://127.0.0.1:8545'] : [
  rpc || 'https://bsc-dataseed.bnbchain.org',
  'https://bsc.publicnode.com',
]
export const client = createPublicClient({
  chain,
  transport: fallback(endpoints.map(url => http(url, { timeout: 9_000, retryCount: 0 })), { retryCount: 0 }),
})
export const abi = parseAbi([
  'struct Record { address author; address reviewer; bytes32 digest; uint48 createdAt; uint48 updatedAt; uint48 createdBlock; uint48 updatedBlock; uint8 status; }',
  'function request(address reviewer, bytes32 digest) returns (uint256 id)',
  'function decide(uint256 id, bool approve)',
  'function withdraw(uint256 id)',
  'function revokeApproval(uint256 id)',
  'function getRecord(uint256 id) view returns (Record)',
  'function requestCount(address account) view returns (uint256)',
  'function requestPage(address account, uint256 end) view returns (uint256[] ids, uint256 next)',
  'event Requested(uint256 indexed id, address indexed author, address indexed reviewer, bytes32 digest)',
  'event Decided(uint256 indexed id, address indexed actor, uint8 status)',
  'error InvalidRequest()',
  'error AgentIdRequired(address account)',
  'error NotAuthor()',
  'error NotReviewer()',
  'error InvalidStatus()',
])
export const labels = ['Missing', 'Pending', 'Approved', 'Declined', 'Withdrawn', 'Revoked'] as const
export const registryAbi = parseAbi(['function balanceOf(address owner) view returns (uint256)'])

export type Intent = { functionName: 'request'; args: readonly [Address, Hex] }
  | { functionName: 'decide'; args: readonly [bigint, boolean] }
  | { functionName: 'withdraw' | 'revokeApproval'; args: readonly [bigint] }

function contract() {
  if (!deployment) throw new Error('The publishing service is not live yet.')
  return { address: deployment, abi }
}

export function hasAgentId(account: Address) {
  return client.readContract({ address: agentId, abi: registryAbi, functionName: 'balanceOf', args: [account] })
    .then(balance => balance > 0n)
}

export function getRecord(id: bigint) {
  return client.readContract({ ...contract(), functionName: 'getRecord', args: [id] })
}

export type RecordData = Awaited<ReturnType<typeof getRecord>>

export async function getReceiptTransactions(id: bigint, record: RecordData) {
  const config = contract()
  const createdBlock = BigInt(record.createdBlock)
  const updatedBlock = BigInt(record.updatedBlock)
  const [created, decided] = await Promise.all([
    client.getContractEvents({ ...config, eventName: 'Requested', args: { id }, fromBlock: createdBlock, toBlock: createdBlock }),
    record.status > 1
      ? client.getContractEvents({ ...config, eventName: 'Decided', args: { id }, fromBlock: updatedBlock, toBlock: updatedBlock })
      : [],
  ])
  return { creation: created[0]?.transactionHash, decision: decided.at(-1)?.transactionHash }
}

export async function listRequests(account: Address, cursor?: bigint) {
  const config = contract()
  const end = cursor ?? await client.readContract({ ...config, functionName: 'requestCount', args: [account] })
  const [ids, next] = await client.readContract({ ...config, functionName: 'requestPage', args: [account, end] })
  const records = await Promise.all(ids.map(async id => ({ id, record: await getRecord(id) })))
  return { records, next }
}

export function parseId(value: string) {
  if (!/^[1-9][0-9]{0,77}$/.test(value)) return undefined
  const id = BigInt(value)
  return id < 2n ** 256n ? id : undefined
}

export const sameAddress = (left?: Address, right?: Address) => Boolean(left && right && isAddressEqual(left, right))
export const shortAddress = (address: Address) => address.slice(0, 6) + '…' + address.slice(-4)

export function addressInput(input: string) {
  const value = input.trim()
  return isAddress(value) && value.toLowerCase() !== zeroAddress ? getAddress(value) : undefined
}

function calldata(intent: Intent) {
  if (intent.functionName === 'request') return encodeFunctionData({ abi, ...intent })
  if (intent.functionName === 'decide') return encodeFunctionData({ abi, ...intent })
  return encodeFunctionData({ abi, ...intent })
}

export function cliPreview(account: Address, intent: Intent) {
  if (chain.id !== 56) throw new Error('The wallet CLI works on BNB Smart Chain.')
  return 'baw contract-call preview --binanceChainId 56 --from ' + account +
    ' --to ' + contract().address + ' --value 0 --inputData ' + calldata(intent) + ' --json'
}

export async function simulate(account: Address, intent: Intent) {
  await client.call({ account, to: contract().address, data: calldata(intent), value: 0n })
}

export async function send(provider: EIP1193Provider, account: Address, intent: Intent) {
  const wallet = createWalletClient({ chain, transport: custom(provider) })
  const selected = await wallet.getAddresses()
  if (!selected.some(address => sameAddress(address, account))) {
    throw new Error('The selected wallet changed. Reconnect and try again.')
  }
  if (await wallet.getChainId() !== chain.id) await wallet.switchChain({ id: chain.id })
  return wallet.sendTransaction({ account, chain, to: contract().address, data: calldata(intent), value: 0n })
}

export async function confirmed(hash: Hex, account: Address, intent: Intent): Promise<TransactionReceipt> {
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 75_000, confirmations: 1 })
  if (receipt.status !== 'success') throw new Error('The network rejected this transaction.')
  const tx = await client.getTransaction({ hash: receipt.transactionHash })
  if (!sameAddress(tx.from, account) || !tx.to || !sameAddress(tx.to, contract().address)
      || tx.input.toLowerCase() !== calldata(intent).toLowerCase() || tx.value !== 0n) {
    throw new Error('This transaction does not match the selected action.')
  }
  return receipt
}

export function createdId(receipt: TransactionReceipt) {
  const logs = receipt.logs.filter(log => sameAddress(log.address, deployment))
  const match = parseEventLogs({ abi, logs, eventName: 'Requested' })[0]
  if (!match) throw new Error('The approval request could not be located in the transaction.')
  return match.args.id
}

export function message(error: unknown) {
  if (!(error instanceof Error)) return 'Something went wrong. Try again.'
  const text = error.message
  if (/User rejected|denied|rejected the request/i.test(text)) return 'The wallet request was cancelled.'
  if (/AgentIdRequired|0x8fc/i.test(text)) return 'Both wallets need an Agent ID.'
  if (/insufficient funds/i.test(text)) return 'Add BNB to your wallet to cover network fees.'
  if (/timeout|timed out|network|fetch|rpc/i.test(text) && text.length > 100) return 'The network did not respond. Try again in a moment.'
  return text.length > 220 ? 'The transaction could not be completed. Check your wallet and try again.' : text
}
