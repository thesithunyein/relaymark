import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, ChevronDown, CircleHelp } from 'lucide-react'
import { deployment, explorer } from './chain'
import { ExplorerLink, walletGuide } from './ui'

const guide = [
  ['request', 'Create a request'],
  ['review', 'Review a draft'],
  ['revisions', 'Send a revision'],
  ['verify', 'Verify published text'],
  ['wallets', 'Wallets and fees'],
  ['records', 'What gets recorded'],
] as const

export function Docs() {
  return <div className="inner-page help-page">
    <header className="page-heading help-heading">
      <span className="icon-block"><BookOpen size={21} aria-hidden="true" /></span>
      <h1>Docs</h1>
      <p>Request approval, review changes, and share a receipt.</p>
    </header>
    <div className="docs-grid">
      <nav className="docs-index" aria-label="On this page">
        {guide.map(([id, label]) => <Link key={id} to={'/docs#' + id}>{label}</Link>)}
      </nav>
      <article className="docs-content">
        <section id="request">
          <h2>Create a request</h2>
          <ol>
            <li>Open <Link to="/new">New request</Link> and connect the wallet that holds your Agent ID.</li>
            <li>Enter your reviewer’s Agent ID wallet address and select <strong>Check wallets</strong>.</li>
            <li>Paste or upload the exact text. Confirm <strong>Request approval</strong> in your wallet.</li>
            <li>Copy the review link and send it to your reviewer. For a longer draft, send the file and the public receipt.</li>
          </ol>
        </section>
        <section id="review">
          <h2>Review a draft</h2>
          <p>Open the review link and connect the designated wallet. If the text is missing, paste or upload the file from the sender. Relaymark checks it against the receipt before you can approve.</p>
          <p>Choose <strong>Approve draft</strong> or <strong>Request changes</strong>, then confirm in your wallet. Share the decision with the sender.</p>
        </section>
        <section id="revisions">
          <h2>Send a revision</h2>
          <p>Open the earlier receipt and select <strong>Send revised version</strong>. Edit the text and submit it for a fresh decision. If both drafts are available, you can compare the changed lines.</p>
          <p>Approvals are specific to each receipt. The sender or reviewer can revoke an earlier approval from that receipt.</p>
        </section>
        <section id="verify">
          <h2>Verify published text</h2>
          <p>Open <Link to="/verify">Verify</Link> and enter a receipt link or request number. Paste or upload the published text and select <strong>Check text</strong>. Relaymark checks the text and the current approval status. Anyone can do this without a wallet.</p>
        </section>
        <section id="wallets">
          <h2>Wallets and fees</h2>
          <p>Senders and reviewers need an Agent ID wallet and BNB on BNB Smart Chain to pay network fees. The wallet shows the fee before you confirm.</p>
          <p>Use a compatible browser wallet or follow the <a href={walletGuide} target="_blank" rel="noreferrer">Agentic Wallet CLI guide</a>.</p>
        </section>
        <section id="records">
          <h2>What gets recorded</h2>
          <p>The receipt records the two wallet addresses, a fingerprint of the draft, timestamps, and a decision. The title and draft text stay off-chain.</p>
          <p>Anyone with the full review link can read its draft. For sensitive text, share the file through a private channel and send the public receipt separately.</p>
          {deployment && <ExplorerLink value={deployment}>View the contract on BscScan</ExplorerLink>}
        </section>
      </article>
    </div>
    <div className="help-next"><Link className="button primary" to="/new">Start a request <ArrowRight size={16} /></Link>
      <Link className="button secondary" to="/faq">Read the FAQ</Link></div>
  </div>
}

const questions = [
  {
    question: 'Do I need a wallet to verify a receipt?',
    answer: <>Verification is public. Open <Link to="/verify">Verify</Link> with a receipt link or request number and provide the published text.</>,
  },
  {
    question: 'Which wallet should I connect?',
    answer: <>Use the BNB Smart Chain address that holds your Agent ID. The sender and designated reviewer both need an Agent ID. Public readers can verify with no wallet.</>,
  },
  {
    question: 'What does Relaymark cost?',
    answer: <>Relaymark charges no platform fee. You pay the BNB Smart Chain network fee when you record a request or decision. Your wallet shows the fee before confirmation.</>,
  },
  {
    question: 'Who can read my draft?',
    answer: <>Anyone with a review link that includes the draft can read it. The public receipt link contains the request number and any comparison reference. The draft text stays off-chain.</>,
  },
  {
    question: 'What happens when the text changes?',
    answer: <>Edited text fails verification against the previous receipt. Send the updated draft for a new approval. Each receipt keeps its own decision.</>,
  },
  {
    question: 'Can I withdraw a request or revoke approval?',
    answer: <>The sender can withdraw a pending request. The sender or reviewer can revoke an existing approval. The receipt shows the current status.</>,
  },
  {
    question: 'What does an approval prove?',
    answer: <>It shows that the designated wallet approved the recorded text fingerprint. The people or organizations behind the wallets and the claims in the text are for readers to verify separately.</>,
  },
  {
    question: 'Where can I check a transaction?',
    answer: <>Open the transaction link from the receipt to see it on <a href={explorer} target="_blank" rel="noreferrer">BscScan</a>.</>,
  },
]

export function Faq() {
  return <div className="inner-page help-page faq-page">
    <header className="page-heading help-heading">
      <span className="icon-block"><CircleHelp size={21} aria-hidden="true" /></span>
      <h1>FAQ</h1>
      <p>Quick answers about wallets, drafts, and receipts.</p>
    </header>
    <div className="faq-list">
      {questions.map(({ question, answer }) => <details key={question}>
        <summary>{question}<ChevronDown size={19} aria-hidden="true" /></summary>
        <p>{answer}</p>
      </details>)}
    </div>
    <div className="help-next"><Link className="button secondary" to="/docs">Open the docs <ArrowRight size={16} /></Link></div>
  </div>
}
