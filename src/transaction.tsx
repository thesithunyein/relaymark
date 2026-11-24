import { useEffect, useState } from 'react'
import { ArrowRight, Terminal } from 'lucide-react'
import type { Hex, TransactionReceipt } from 'viem'
import { cliPreview, confirmed, message, send, simulate, type Intent } from './chain'
import { CopyButton, ErrorText, ExplorerLink, Modal, walletGuide } from './ui'
import { useWallet } from './wallet'

export type Transaction = { intent: Intent; title: string; description: string; onSuccess: (receipt: TransactionReceipt) => void }

export function TransactionDialog({ action, close }: { action: Transaction; close: () => void }) {
  const { active } = useWallet()
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const [hash, setHash] = useState('')
  const [broadcastHash, setBroadcastHash] = useState<Hex>()
  const [account] = useState(active?.account)
  const [provider] = useState(active?.provider)

  useEffect(() => {
    if (account && active?.account !== account) setError('The selected wallet changed. Reopen this action to continue.')
  }, [account, active?.account])

  async function run() {
    if (!account || active?.account !== account || pending) return
    setError('')
    try {
      let transaction = broadcastHash
      if (!transaction && provider) {
        setPending('Checking request…')
        await simulate(account, action.intent)
        setPending('Confirm in your wallet…')
        transaction = await send(provider, account, action.intent)
        setBroadcastHash(transaction)
      }
      if (!transaction) {
        if (!/^0x[0-9a-f]{64}$/i.test(hash.trim())) throw new Error('Enter the transaction hash from your wallet CLI.')
        transaction = hash.trim() as Hex
      }
      setPending('Waiting for confirmation…')
      const receipt = await confirmed(transaction, account, action.intent)
      action.onSuccess(receipt)
      close()
    } catch (error) { setError(message(error)) }
    finally { setPending('') }
  }

  return <Modal title={action.title} close={() => { if (!pending) close() }}>
    <p className="dialog-copy">{action.description} Your wallet pays the network fee.</p>
    {!provider && account && <div className="cli-instructions">
      <p><Terminal size={16} /> Preview in your wallet CLI, check the details, then confirm in your wallet.</p>
      <CopyButton value={cliPreview(account, action.intent)} label="Copy preview command" />
      <a href={walletGuide} className="inline-link" target="_blank" rel="noreferrer">Wallet CLI instructions</a>
      <label htmlFor="tx-hash">Transaction hash</label>
      <input id="tx-hash" placeholder="0x…" value={hash} onChange={e => setHash(e.target.value)} spellCheck={false} />
    </div>}
    {broadcastHash && <ExplorerLink value={broadcastHash} type="tx">View transaction</ExplorerLink>}
    <ErrorText>{error}</ErrorText>
    <div className="dialog-actions">
      <button className="button secondary" type="button" onClick={close} disabled={Boolean(pending)}>Close</button>
      <button className="button primary" type="button" onClick={run} aria-busy={Boolean(pending)}
        disabled={Boolean(pending) || !account || active?.account !== account}>
        {pending || (provider ? broadcastHash ? 'Check confirmation' : 'Continue to wallet' : 'Confirm transaction')} <ArrowRight size={16} />
      </button>
    </div>
  </Modal>
}
