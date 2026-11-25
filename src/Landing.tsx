import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, BookOpen, CircleHelp, FileCheck2, FileText, Fingerprint,
  GitCompareArrows, Handshake, LockKeyhole, Megaphone, PackageCheck, PenLine,
} from 'lucide-react'
import { ReceiptArt } from './ui'
import { ReceiptLookup } from './Verify'

const steps = [
  { icon: FileText, title: 'Send the exact draft', text: 'Choose one reviewer.' },
  { icon: PenLine, title: 'Get a decision', text: 'Approve or request changes.' },
  { icon: FileCheck2, title: 'Share the receipt', text: 'Anyone can check the published text.' },
]

const useCases = [
  { icon: Handshake, title: 'Partnerships', text: 'Agree on wording across two organizations.' },
  { icon: PackageCheck, title: 'Release notes', text: 'Confirm the changes and claims going out with a release.' },
  { icon: Megaphone, title: 'Public statements', text: 'Get sign-off before an update reaches your audience.' },
]

export function Landing() {
  return <div className="landing">
    <section className="launch-board" aria-labelledby="home-title">
      <div className="launch-primary">
        <div className="launch-copy">
          <p className="launch-label"><FileCheck2 size={17} aria-hidden="true" /> Publishing approvals</p>
          <h1 id="home-title">Clear to <span>publish.</span></h1>
          <p className="launch-summary">Agree on the exact text before it goes live.</p>
        </div>
        <div className="launch-art"><ReceiptArt /></div>
        <div className="launch-actions">
          <Link to="/new" className="button primary">Request approval <ArrowRight size={19} /></Link>
        </div>
      </div>

      <div className="board-tools">
        <section className="board-card lookup-card" aria-labelledby="lookup-title">
          <div className="board-card-title">
            <div><h2 id="lookup-title">Verify a receipt</h2>
              <p>Check published text against an approval.</p></div>
            <span className="board-icon"><Fingerprint size={24} aria-hidden="true" /></span>
          </div>
          <ReceiptLookup embedded />
          <p className="board-note"><LockKeyhole size={14} aria-hidden="true" /> No wallet needed to verify.</p>
        </section>

        <section className="board-card workflow-card" aria-labelledby="workflow-title">
          <div className="board-card-title">
            <h2 id="workflow-title">How it works</h2>
            <Link to="/docs" className="inline-link">Read the guide <ArrowUpRight size={15} /></Link>
          </div>
          <ol className="workflow-list">
            {steps.map(({ icon: Icon, title, text }) => <li key={title}>
              <span className="board-icon"><Icon size={19} aria-hidden="true" /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>)}
          </ol>
        </section>

        <div className="board-links">
          <Link to="/docs#revisions"><GitCompareArrows size={20} aria-hidden="true" /><span>Compare versions</span><ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link to="/docs#records"><LockKeyhole size={19} aria-hidden="true" /><span>Draft privacy</span><ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>

    <section className="landing-uses" aria-labelledby="use-title">
      <div className="landing-section-title">
        <h2 id="use-title">For teams that publish together.</h2>
        <p>Use Relaymark when the wording needs a second sign-off.</p>
      </div>
      <div className="use-list">
        {useCases.map(({ icon: Icon, title, text }) => <article key={title}>
          <Icon size={22} aria-hidden="true" />
          <div><h3>{title}</h3><p>{text}</p></div>
        </article>)}
      </div>
    </section>

    <nav className="landing-help" aria-label="Product help">
      <Link to="/docs"><BookOpen size={19} aria-hidden="true" /> Docs <ArrowUpRight size={14} aria-hidden="true" /></Link>
      <Link to="/faq"><CircleHelp size={19} aria-hidden="true" /> FAQ <ArrowUpRight size={14} aria-hidden="true" /></Link>
    </nav>
  </div>
}
