import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ArrowRight, CircleAlert, SquareTerminal, Wallet } from 'lucide-react'
import { deployment, message, shortAddress } from './chain'
import { Compose } from './Compose'
import { Receipt } from './Receipt'
import { Verify } from './Verify'
import { Workspace } from './Workspace'
import { Docs, Faq } from './Help'
import { ErrorText, Mark, Modal, walletGuide } from './ui'
import { TransactionDialog, type Transaction } from './transaction'
import { WalletProvider, useWallet } from './wallet'

function WalletLogo({ icon }: { icon?: string }) {
  const [failedIcon, setFailedIcon] = useState<string>()
  return icon && icon !== failedIcon
    ? <img className="wallet-logo" src={icon} alt="" onError={() => setFailedIcon(icon)} />
    : <Wallet size={20} aria-hidden="true" />
}

function WalletDialog() {
  const { active, choices, connect, useCli, disconnect, setOpen } = useWallet()
  const [advanced, setAdvanced] = useState(false)
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function manual(event: FormEvent) {
    event.preventDefault()
    setError('')
    try { useCli(address) } catch (error) { setError(message(error)) }
  }

  return <Modal title={active ? 'Your wallet' : 'Connect wallet'} close={() => { if (!busy) setOpen(false) }}>
    {active ? <><p className="dialog-copy">{active.name}</p><p className="full-address">{active.account}</p>
      <button className="button secondary" type="button" onClick={disconnect}>Disconnect</button></> : <>
      <p className="dialog-copy">Use the wallet that holds your Agent ID.</p>
      {choices.map(choice => <button key={choice.id} className="wallet-option" type="button" disabled={busy}
        onClick={async () => {
          setBusy(true); setError('')
          try { await connect(choice) } catch (err) { setError(message(err)) } finally { setBusy(false) }
        }}>
        <WalletLogo icon={choice.icon} />
        <span>{choice.name}</span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>)}
      {!choices.length && <p className="hint">Open Relaymark in a wallet browser, or use the wallet CLI.</p>}
      <button className="text-button" type="button" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}><SquareTerminal size={16} /> Use wallet CLI</button>
      {advanced && <form onSubmit={manual} className="cli-instructions">
        <label htmlFor="wallet-cli-address">Agent ID wallet address</label>
        <input id="wallet-cli-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="0x…" spellCheck={false} />
        <p className="hint">You’ll preview and confirm transactions in your own wallet.</p>
        <a className="inline-link" href={walletGuide} target="_blank" rel="noreferrer">Wallet CLI instructions</a>
        <button className="button primary" type="submit">Continue <ArrowRight size={15} /></button>
      </form>}
      <ErrorText>{error}</ErrorText>
    </>}
  </Modal>
}

function Layout() {
  const location = useLocation()
  const { active, open, setOpen } = useWallet()
  const [action, setAction] = useState<Transaction>()
  useEffect(() => {
    const titles: Record<string, string> = { '/docs': 'Docs', '/faq': 'FAQ', '/new': 'New request', '/verify': 'Verify a receipt' }
    const title = titles[location.pathname] ?? (location.pathname.startsWith('/requests/') ? 'Review receipt' : 'Publishing approvals')
    document.title = title + ' · Relaymark'
    if (location.pathname === '/docs' && location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView()
    } else if (location.hash !== '#verify' && location.hash !== '#main') window.scrollTo(0, 0)
  }, [location.pathname, location.hash])

  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="shell header-shell">
        <Link to="/" className="brand"><Mark /> <span>Relaymark</span></Link>
        <nav aria-label="Primary">
          <NavLink to="/" end>Workspace</NavLink>
          <NavLink to="/verify">Verify</NavLink>
          <NavLink to="/docs">Docs</NavLink>
          <NavLink to="/faq">FAQ</NavLink>
        </nav>
        <button type="button" className="button wallet-button" aria-label={active ? 'Manage connected wallet' : 'Connect wallet'} onClick={() => setOpen(true)}>
          <Wallet size={17} /> <span>{active ? shortAddress(active.account) : 'Connect wallet'}</span>
        </button>
      </div>
    </header>
    <main id="main" className="shell main-shell">
      {!deployment && <p className="info offline"><CircleAlert size={16} /> Publishing is offline until the contract is connected.</p>}
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route path="/new" element={<Compose setAction={setAction} />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/requests/:id" element={<Receipt setAction={setAction} />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/fqa" element={<Navigate to="/faq" replace />} />
        <Route path="*" element={<section className="inner-page"><div className="page-heading"><h1>Page not found</h1>
          <p>Try the workspace or check your link.</p></div><Link className="button primary" to="/">Open workspace <ArrowRight size={16} /></Link></section>} />
      </Routes>
    </main>
    <footer className="site-footer"><div className="shell footer-shell">
      <Link className="brand" to="/"><Mark /> <span>Relaymark</span></Link>
      <span>Publishing approvals on BNB Smart Chain</span>
      <nav className="footer-links" aria-label="Footer">
        <Link to="/verify">Verify</Link><Link to="/docs">Docs</Link><Link to="/faq">FAQ</Link>
      </nav>
    </div></footer>
    {open && <WalletDialog />}
    {action && <TransactionDialog action={action} close={() => setAction(undefined)} />}
  </>
}

export function App() {
  return <WalletProvider><Layout /></WalletProvider>
}
