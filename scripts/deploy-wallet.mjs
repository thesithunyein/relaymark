import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

const artifact = JSON.parse(await readFile(new URL('../out/Relaymark.sol/Relaymark.json', import.meta.url), 'utf8'))
const registry = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F'
const data = artifact.bytecode.object + registry.slice(2).toLowerCase().padStart(64, '0')
if (!/^0x[0-9a-f]+$/.test(data)) throw new Error('Run forge build before launching the deploy helper.')

const page = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deploy Relaymark</title>
<style>body{margin:9vh auto;padding:0 20px;max-width:630px;background:#f9f8f4;color:#212b24;font:16px/1.6 system-ui}button,select{padding:12px 18px;border:1px solid #263e32;border-radius:8px;font:inherit}button{background:#263e32;color:white;cursor:pointer}select{background:white;color:#212b24;display:block;margin:5px 0 16px;max-width:100%}button:disabled{opacity:.55}code,pre{overflow-wrap:anywhere;white-space:pre-wrap}</style>
<h1>Deploy Relaymark</h1>
<p>Deploy the approval contract on BNB Smart Chain. Check the network fee in your wallet before confirming.</p>
<p>Agent ID registry <code>${registry}</code></p>
<label for="wallet">Deployment wallet</label>
<select id="wallet"><option value="">Choose a wallet</option></select>
<button id="deploy" disabled>Connect wallet and deploy</button>
<pre id="result" role="status" aria-live="polite">Your wallet opens when you click the button.</pre>
<script src="/deploy.js"></script>
</html>`

const script = `
const button = document.getElementById('deploy')
const result = document.getElementById('result')
const selector = document.getElementById('wallet')
const wallets = new Map()
let busy = false
function updateButton() {
  button.disabled = busy || !wallets.has(selector.value)
  selector.disabled = busy
}
function addWallet(id, name, provider) {
  if (!provider?.request || wallets.has(id) || [...wallets.values()].includes(provider)) return
  wallets.set(id, provider)
  selector.add(new Option(name, id))
}
window.addEventListener('eip6963:announceProvider', event => {
  const info = event.detail?.info
  if (!info?.uuid || !info.name) return
  addWallet(info.uuid, info.name, event.detail.provider)
  updateButton()
})
window.dispatchEvent(new Event('eip6963:requestProvider'))
selector.addEventListener('change', () => {
  result.textContent = 'Confirm in the wallet you selected.'
  updateButton()
})
setTimeout(() => {
  const injected = window.ethereum
  const providers = injected?.providers?.length ? injected.providers : [injected]
  providers.forEach((provider, index) => {
    if (!provider?.request) return
    const label = provider.isMetaMask ? 'MetaMask (injected)' : 'Browser wallet ' + (index + 1)
    if (!wallets.size || injected?.providers?.length) addWallet('injected-' + index, label, provider)
  })
  if (!wallets.size) result.textContent = 'No wallet detected. Open this page in the browser with your funded wallet extension.'
  updateButton()
}, 500)

async function selectNetwork(wallet) {
  const chainId = '0x38'
  const currentChain = async () => Number(await wallet.request({ method: 'eth_chainId' }))
  if (await currentChain() === 56) return
  const switchChain = () => wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
  try {
    await switchChain()
  } catch (error) {
    if (Number(error?.code) !== 4902 && !/unrecognized chain|unknown chain|chain not added/i.test(error?.message ?? '')) throw error
    result.textContent = 'Approve adding BNB Smart Chain in your wallet.'
    await wallet.request({ method: 'wallet_addEthereumChain', params: [{
      chainId, chainName: 'BNB Smart Chain',
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
      rpcUrls: ['https://bsc-dataseed.bnbchain.org'],
      blockExplorerUrls: ['https://bscscan.com'],
    }] })
    if (await currentChain() !== 56) await switchChain()
  }
  if (await currentChain() !== 56) throw new Error('Switch this wallet to BNB Smart Chain and try again.')
}

button.addEventListener('click', async () => {
  const wallet = wallets.get(selector.value)
  if (!wallet || busy) return
  busy = true
  updateButton()
  try {
    result.textContent = 'Unlock your wallet and check its pop-up or toolbar icon.'
    const prior = localStorage.getItem('relaymark-deployment-tx')
    const accounts = prior ? [] : await wallet.request({ method: 'eth_requestAccounts' })
    if (!prior && !accounts[0]) throw new Error('Choose a funded wallet.')
    result.textContent = 'Checking BNB Smart Chain…'
    await selectNetwork(wallet)
    let hash = prior
    if (!hash) {
      const code = await wallet.request({ method: 'eth_getCode', params: [${JSON.stringify(registry)}, 'latest'] })
      if (!code || code === '0x') throw new Error('Agent ID registry could not be found.')
      const tx = { from: accounts[0], data: ${JSON.stringify(data)}, value: '0x0' }
      await wallet.request({ method: 'eth_estimateGas', params: [tx] })
      result.textContent = 'Check the gas fee and approve in your wallet.'
      hash = await wallet.request({ method: 'eth_sendTransaction', params: [tx] })
      localStorage.setItem('relaymark-deployment-tx', hash)
    }
    result.textContent = 'Submitted: ' + hash
    for (let attempt = 0; attempt < 100; attempt++) {
      const receipt = await wallet.request({ method: 'eth_getTransactionReceipt', params: [hash] })
      if (receipt) {
        if (receipt.status !== '0x1' || !receipt.contractAddress) {
          localStorage.removeItem('relaymark-deployment-tx')
          throw new Error('Deployment reverted: ' + hash)
        }
        result.textContent = 'Contract address: ' + receipt.contractAddress + '\\nTransaction: ' + hash
        return
      }
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    result.textContent = 'Check this transaction in BscScan: ' + hash
  } catch (error) {
    result.textContent = /unrecognized chain|unknown chain|not supported|not implemented/i.test(error?.message ?? '')
      ? 'This wallet could not open BNB Smart Chain. Choose MetaMask or another BNB Smart Chain wallet.'
      : error?.message ?? 'The wallet could not complete the deployment.'
  } finally {
    busy = false
    updateButton()
  }
})
`

const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'")
  if (request.method === 'GET' && request.url === '/') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(page)
  } else if (request.method === 'GET' && request.url === '/deploy.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8')
    response.end(script)
  } else {
    response.writeHead(404).end()
  }
})
server.listen(4181, '127.0.0.1', () => console.log('Open http://127.0.0.1:4181 in your wallet browser.'))
