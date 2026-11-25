import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { ReceiptLookup } from './Verify'

const steps = [
  { title: 'Send a draft', text: 'Choose one reviewer and share the exact text.' },
  { title: 'Get a decision', text: 'Your reviewer approves it or requests changes.' },
  { title: 'Share the receipt', text: 'Anyone can check that the published text matches.' },
]

export function Landing() {
  return <div className="landing">
    <section className="launch-board" aria-labelledby="home-title">
      <div className="launch-primary">
        <h1 id="home-title">Clear to publish.</h1>
        <p className="launch-summary">Get sign-off on the exact wording before it goes live.</p>
        <Link to="/new" className="button primary">Request approval <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>

      <section className="lookup-card" aria-labelledby="lookup-title">
        <div className="lookup-heading">
          <div>
            <h2 id="lookup-title">Verify a receipt</h2>
            <p>Check published text against an approval.</p>
          </div>
          <svg className="lookup-art" viewBox="0 0 72 72" fill="none" aria-hidden="true">
            <rect width="72" height="72" rx="21" fill="var(--accent-soft)" />
            <path d="M48 31V19a5 5 0 0 0-5-5H25a5 5 0 0 0-5 5v34a5 5 0 0 0 5 5h8" stroke="var(--forest)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M27 25h14m-14 9h10m-10 9h5" stroke="var(--forest)" strokeWidth="3" strokeLinecap="round" />
            <rect x="37" y="36" width="23" height="23" rx="8" fill="var(--forest)" />
            <path d="m43 47 4 4 7-8" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <ReceiptLookup embedded />
        <p className="board-note"><ShieldCheck size={16} aria-hidden="true" /> No wallet needed.</p>
      </section>
    </section>

    <section className="landing-workflow" aria-labelledby="workflow-title">
      <div className="workflow-heading">
        <h2 id="workflow-title">How it works</h2>
        <Link to="/docs" className="inline-link">Read the guide <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <ol className="workflow-list">
        {steps.map(({ title, text }) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}
      </ol>
    </section>
  </div>
}
