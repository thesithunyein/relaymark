import { readFile } from 'node:fs/promises'
import {
  createPublicClient, fallback, http, isAddress, isAddressEqual, keccak256,
  parseAbi, toBytes,
} from 'viem'
import { bsc } from 'viem/chains'

const mainnetContract = '0x423b8701da3a251a3a3fc2d241b71e8d05744c91'
const abi = parseAbi([
  'struct Record { address author; address reviewer; bytes32 digest; uint48 createdAt; uint48 updatedAt; uint48 createdBlock; uint48 updatedBlock; uint8 status; }',
  'function getRecord(uint256 id) view returns (Record)',
])
const statuses = ['Missing', 'Pending', 'Approved', 'Declined', 'Withdrawn', 'Revoked']

async function checkRelease() {
  const [receipt, path, reviewer, ...extra] = process.argv.slice(2)
  if (!receipt || !/^[1-9][0-9]{0,77}$/.test(receipt) || !path || !reviewer || !isAddress(reviewer) || extra.length) {
    throw new Error('Usage: npm run check:release -- <receipt-number> <notes-file> <reviewer-address>')
  }
  const id = BigInt(receipt)
  if (id >= 1n << 256n) throw new Error('The receipt number is outside the contract’s range.')

  const address = process.env.RELAYMARK_CONTRACT_ADDRESS || mainnetContract
  if (!isAddress(address)) throw new Error('Invalid Relaymark contract address.')
  const nodes = process.env.RELAYMARK_RPC_URL
    ? [process.env.RELAYMARK_RPC_URL]
    : ['https://bsc-dataseed.bnbchain.org', 'https://bsc.publicnode.com']
  const client = createPublicClient({
    chain: bsc,
    transport: fallback(nodes.map(url => http(url, { timeout: 9000, retryCount: 0 })), { retryCount: 0 }),
  })

  const notes = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path))
  const digest = keccak256(toBytes(notes.replace(/\r\n?/g, '\n')))
  if (await client.getChainId() !== bsc.id) throw new Error('The RPC must report BNB Smart Chain (56).')
  const record = await client.readContract({ address, abi, functionName: 'getRecord', args: [id] })
  if (record.status !== 2) throw new Error(`Receipt #${receipt} is ${statuses[record.status] ?? 'unknown'}. An active approval is required.`)
  if (!isAddressEqual(record.reviewer, reviewer)) throw new Error('The receipt belongs to a different reviewer.')
  if (record.digest !== digest) throw new Error('The release notes differ from the approved text.')
  console.log(`Receipt #${receipt} matches the release notes and the expected reviewer.`)
}

try {
  await checkRelease()
} catch (error) {
  console.error('Release check failed. ' + (error.shortMessage || error.message))
  process.exitCode = 1
}
