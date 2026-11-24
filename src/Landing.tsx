import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, FileCheck2, FileText, Fingerprint, GitCompareArrows,
  Handshake, LockKeyhole, Megaphone, PackageCheck, PenLine, ShieldCheck,
} from 'lucide-react'
import { ReceiptArt } from './ui'

const steps = [
  { icon: FileText, title: 'Send a draft', text: 'Add the exact text and choose one reviewer.' },
  { icon: PenLine, title: 'Get a decision', text: 'Your reviewer approves or requests changes from their wallet.' },
  { icon: FileCheck2, title: 'Publish with proof', text: 'Share a receipt anyone can check against the published text.' },
]

const useCases = [
  { icon: Handshake, title: 'Partnerships', text: 'Agree on wording across two organizations.' },
  { icon: PackageCheck, title: 'Release notes', text: 'Confirm the changes and claims going out with a release.' },
  { icon: Megaphone, title: 'Public statements', text: 'Get sign-off before an update reaches your audience.' },
]

function RevisionArt() {
  return <div className="revision-art" aria-hidden="true">
    <div className="revision-sheet revision-sheet-before">
      <span><FileText size={17} /> Earlier draft</span><i /><i /><i />
    </div>
    <div className="revision-sheet revision-sheet-after">
      <span><ShieldCheck size={17} /> Revised draft</span><i /><i /><i />
    </div>
  </div>
}

export function Landing({ connect }: { connect: () => void }) {
  return <>
    <section className="hero" aria-labelledby="home-title">
      <div className="hero-content">
        <h1 id="home-title">Clear to <span>publish.</span></h1>
        <p>Agree on the exact text before it goes live.</p>
        <div className="hero-actions">
          <Link to="/new" className="button primary">Request approval <ArrowRight size={17} /></Link>
          <Link to="/verify" className="button quiet">Verify a receipt <ArrowUpRight size={16} /></Link>
        </div>
      </div>
      <div className="hero-visual"><ReceiptArt /></div>
    </section>

    <section className="landing-section" aria-labelledby="workflow-title">
      <h2 id="workflow-title">From draft to sign-off.</h2>
      <div className="landing-steps">
        {steps.map(({ icon: Icon, title, text }) => <article key={title}>
          <span className="icon-block"><Icon size={22} aria-hidden="true" /></span>
          <h3>{title}</h3><p>{text}</p>
        </article>)}
      </div>
    </section>

    <section className="landing-section" aria-labelledby="proof-title">
      <h2 id="proof-title">Know exactly what was approved.</h2>
      <div className="landing-features">
        <article className="feature-card feature-revision">
          <div className="feature-copy">
            <GitCompareArrows size={24} aria-hidden="true" />
            <h3>Review the changes.</h3>
            <p>Compare drafts and see which version received approval.</p>
            <Link to="/docs#revisions" className="inline-link">How revisions work <ArrowUpRight size={15} /></Link>
          </div>
          <RevisionArt />
        </article>
        <article className="feature-card feature-receipt">
          <div className="feature-copy">
            <Fingerprint size={24} aria-hidden="true" />
            <h3>Check any receipt.</h3>
            <p>Paste the published text to see whether it matches the approved version.</p>
            <Link to="/verify" className="inline-link">Verify text <ArrowUpRight size={15} /></Link>
          </div>
          <div className="fingerprint-visual">
            <div className="fingerprint-ring" aria-hidden="true"><Fingerprint size={109} strokeWidth={1.05} /></div>
            <span><LockKeyhole size={17} aria-hidden="true" /> Draft text stays off-chain</span>
          </div>
        </article>
      </div>
    </section>

    <section className="landing-section landing-use" aria-labelledby="use-title">
      <div><h2 id="use-title">For teams that publish together.</h2>
        <p>Use Relaymark when the exact wording needs a second sign-off.</p></div>
      <div className="use-list">
        {useCases.map(({ icon: Icon, title, text }) => <article key={title}>
          <Icon size={20} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div>
        </article>)}
      </div>
    </section>

    <section className="landing-resources" aria-labelledby="resources-title">
      <div><h2 id="resources-title">Ready to get started?</h2>
        <p>Connect to see your requests, or learn how Relaymark works.</p></div>
      <div className="resource-actions">
        <button type="button" className="button primary" onClick={connect}>Connect wallet <ArrowRight size={17} /></button>
        <Link to="/docs" className="button secondary">Read the docs</Link>
      </div>
    </section>
  </>
}
