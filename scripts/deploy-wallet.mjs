import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

const artifact = JSON.parse(await readFile(new URL('../out/Relaymark.sol/Relaymark.json', import.meta.url), 'utf8'))
const registry = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F'
const data = artifact.bytecode.object + registry.slice(2).toLowerCase().padStart(64, '0')
if (!/^0x[0-9a-f]+$/.test(data)) throw new Error('Run forge build before launching the deploy helper.')

const page = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deploy Relaymark</title>
<style>body{margin:9vh auto;padding:0 20px;max-width:630px;background:#f9f8f4;color:#212b24;font:16px/1.6 system-ui}button{padding:12px 18px;border:0;border-radius:8px;background:#263e32;color:white;cursor:pointer;font:inherit}button:disabled{opacity:.55}code,pre{overflow-wrap:anywhere;white-space:pre-wrap}</style>
<h1>Deploy Relaymark</h1>
<p>Deploy the approval contract on BNB Smart Chain. Check the network fee in your wallet before confirming.</p>
<p>Agent ID registry <code>${registry}</code></p>
<p id="wallet-name">Checking for a browser wallet…</p>
<button id="deploy">Connect wallet and deploy</button>
<pre id="result" role="status" aria-live="polite">Your wallet opens when you click the button.</pre>
<script src="/deploy.js"></script>
</html>`

const script = `
const button = document.getElementById('deploy')
const result = document.getElementById('result')
const name = document.getElementById('wallet-name')
let detected
function showWallet() {
  name.textContent = detected ? 'Wallet: ' + detected.info.name : window.ethereum
    ? 'Browser wallet detected.'
    : 'No wallet detected. Open this address in your wallet extension’s browser.'
}
window.addEventListener('eip6963:announceProvider', event => {
  if (!event.detail?.provider?.request) return
  detected ??= event.detail
  showWallet()
})
window.dispatchEvent(new Event('eip6963:requestProvider'))
setTimeout(showWallet, 500)
button.addEventListener('click', async () => {
  button.disabled = true
  try {
    const wallet = detected?.provider ?? window.ethereum
    if (!wallet) throw new Error('This browser has no wallet extension. Open the page in the browser where your funded BNB wallet is installed.')
    result.textContent = 'Unlock your wallet and check its pop-up or toolbar icon.'
    const prior = localStorage.getItem('relaymark-deployment-tx')
    const accounts = prior ? [] : await wallet.request({ method: 'eth_requestAccounts' })
    if (!prior && !accounts[0]) throw new Error('Choose a funded wallet.')
    result.textContent = 'Checking BNB Smart Chain…'
    if (await wallet.request({ method: 'eth_chainId' }) !== '0x38') {
      await wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] })
    }
    if (await wallet.request({ method: 'eth_chainId' }) !== '0x38') throw new Error('Select BNB Smart Chain.')
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
    result.textContent = error.message
    button.disabled = false
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
