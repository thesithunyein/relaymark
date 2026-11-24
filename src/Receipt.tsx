import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, Check, Download, FileText, Fingerprint, Link2, ShieldCheck, X } from 'lucide-react'
import type { Hex } from 'viem'
import { deployment, getReceiptTransactions, getRecord, message, parseId, sameAddress, shortAddress, type Intent, type RecordData } from './chain'
import { byteLength, downloadText, fingerprint, linkedDraft, maxBytes, reviewFragment, savedDraft, saveDraft, type Draft } from './documents'
import { CopyButton, ErrorText, ExplorerLink, Status, Upload } from './ui'
import { useWallet } from './wallet'
import type { Transaction } from './transaction'

function displayDate(timestamp: bigint | number) {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function Receipt(props: { setAction: (action: Transaction) => void }) {
  const { id: raw } = useParams()
  const id = parseId(raw ?? '')
  if (!id) return <Missing label="Receipt not found" copy="Check the link or open another request." />
  return <ReceiptScreen key={id.toString()} id={id} {...props} />
}

function Missing({ label, copy }: { label: string; copy: string }) {
  return <section className="inner-page verify-page"><Link className="back" to="/"><ArrowLeft size={16} /> Workspace</Link>
    <div className="page-heading"><h1>{label}</h1><p>{copy}</p></div>
    <Link className="button secondary" to="/verify">Find a receipt</Link></section>
}

function ReceiptScreen({ id, setAction }: { id: bigint; setAction: (action: Transaction) => void }) {
  const location = useLocation()
  const { active, setOpen } = useWallet()
  const [record, setRecord] = useState<RecordData>()
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => savedDraft(id) ?? { title: 'Request #' + id, body: '' })
  const [share, setShare] = useState<string>()
  const [error, setError] = useState('')
  const [draftError, setDraftError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [transaction, setTransaction] = useState<Hex>()
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getReceiptTransactions>>>()
  const [candidate, setCandidate] = useState('')
  const [result, setResult] = useState<'match' | 'mismatch'>()
  const [verificationError, setVerificationError] = useState('')
  const [verifiedStatus, setVerifiedStatus] = useState<number>()
  const [verifying, setVerifying] = useState(false)
  const verifyRef = useRef<HTMLDivElement>(null)
  const bare = window.location.origin + '/requests/' + id
  const isAuthor = sameAddress(active?.account, record?.author)
  const isReviewer = sameAddress(active?.account, record?.reviewer)
  const match = Boolean(record && draft.body && fingerprint(draft.body) === record.digest)

  useEffect(() => {
    let active = true
    setError('')
    getRecord(id).then(next => {
      if (active) { setRecord(next); setLoaded(true) }
    }).catch(error => { if (active) { setError(message(error)); setLoaded(true) } })
    return () => { active = false }
  }, [id, refresh])

  useEffect(() => {
    let active = true
    setDraftError('')
    linkedDraft(location.hash).then(data => {
      if (active && data) setDraft(data)
    }).catch(() => { if (active) setDraftError('This link could not open the draft. Ask the sender for the text file.') })
    return () => { active = false }
  }, [location.hash])

  useEffect(() => {
    if (location.hash === '#verify' && loaded) verifyRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [loaded, location.hash])

  useEffect(() => {
    let live = true
    if (record?.status) getReceiptTransactions(id, record).then(receipts => {
      if (live) setHistory(receipts)
    }).catch(() => { /* The chain record is still readable if transaction indexing is unavailable. */ })
    return () => { live = false }
  }, [id, record])

  useEffect(() => {
    let live = true
    setShare(undefined)
    if (match) {
      reviewFragment(draft).then(fragment => { if (live) setShare(fragment ? bare + fragment : undefined) })
        .catch(() => { /* Long drafts can be downloaded instead. */ })
    }
    return () => { live = false }
  }, [bare, draft, match])

  function act(intent: Intent, title: string, description: string) {
    if (!deployment || !active) { setOpen(true); return }
    setAction({
      intent, title, description,
      onSuccess: receipt => {
        setTransaction(receipt.transactionHash)
        setResult(undefined)
        if (match) saveDraft(id, draft)
        setRefresh(value => value + 1)
      },
    })
  }

  async function verify(event: FormEvent) {
    event.preventDefault()
    setVerificationError('')
    setResult(undefined)
    if (!candidate.trim() || byteLength(candidate) > maxBytes) {
      setVerificationError('Provide the published text, up to 250 KB.')
      return
    }
    setVerifying(true)
    try {
      const current = await getRecord(id)
      setRecord(current)
      setVerifiedStatus(current.status)
      setResult(fingerprint(candidate) === current.digest ? 'match' : 'mismatch')
    } catch (error) { setVerificationError(message(error)) }
    finally { setVerifying(false) }
  }

  if (!deployment) return <Missing label="Receipts are offline" copy="Publishing will open when the contract is connected." />
  if (loaded && !error && !record?.status) return <Missing label="Receipt not found" copy="Check the request number and try again." />

  return <section className="inner-page">
    <Link className="back" to="/"><ArrowLeft size={16} /> Workspace</Link>
    {!record ? <div className="panel form-panel">
      {error ? <><ErrorText>{error}</ErrorText><button className="button secondary" onClick={() => setRefresh(value => value + 1)}>Try again</button></>
        : <div aria-label="Loading receipt" role="status"><div className="skeleton" /><div className="skeleton" /></div>}
    </div> : <>
      <div className="page-heading receipt-heading">
        <div><span className="receipt-number">REQUEST #{id.toString()}</span>
          <h1>{match ? draft.title : 'Review receipt'}</h1><p>Recorded {displayDate(record.createdAt)}</p></div>
        <Status status={record.status} />
      </div>
      {location.state?.justCreated && <p role="status" className="info success"><Check size={17} /> Request recorded. Send the review link to your reviewer.</p>}
      {transaction && <p role="status" className="info success"><Check size={17} /> Decision recorded. <ExplorerLink type="tx" value={transaction}>View transaction</ExplorerLink></p>}
      <ErrorText>{error}</ErrorText>
      <div className="work-grid receipt-grid">
        <div className="receipt-content">
          <section className="panel form-panel">
            <div className="field-row"><h2><FileText size={20} /> Draft</h2>
              {match ? <button className="text-button" type="button" onClick={() => downloadText(draft.title, draft.body)}><Download size={16} /> Download</button>
                : <Upload onText={body => { setDraft(current => ({ ...current, body })); setDraftError('') }} onError={setDraftError} />}</div>
            <ErrorText>{draftError}</ErrorText>
            {match ? <pre className="paper-text">{draft.body}</pre> : <>
              {draft.body && <p className="info mismatch"><X size={17} /> The draft does not match the recorded fingerprint.</p>}
              <div className="field"><label htmlFor="review-body">Text from the sender</label>
                <textarea id="review-body" value={draft.body} rows={7} placeholder="Open the review link, upload a file, or paste the draft."
                  onChange={e => setDraft(current => ({ ...current, body: e.target.value }))} /></div>
            </>}
            {record.status === 1 && <div className="decision-actions">
              {!active && <button className="button secondary" type="button" onClick={() => setOpen(true)}>Connect to review</button>}
              {isReviewer && <>
                <button className="button secondary" type="button" onClick={() => act({ functionName: 'decide', args: [id, false] }, 'Decline request', 'Record a decline for this request.')}>Decline</button>
                <button className="button primary" type="button" disabled={!match} onClick={() => act({ functionName: 'decide', args: [id, true] }, 'Approve this version', 'Record approval for the matching draft.')}><Check size={17} /> Approve draft</button>
                {!match && <p className="hint">Open a matching draft to approve.</p>}
              </>}
              {isAuthor && <button className="text-button danger" type="button" onClick={() => act({ functionName: 'withdraw', args: [id] }, 'Withdraw request', 'Close this request before it is approved.')}>Withdraw request</button>}
            </div>}
            {record.status === 2 && (isAuthor || isReviewer) && <button className="text-button danger" type="button"
              onClick={() => act({ functionName: isAuthor ? 'withdraw' : 'revokeApproval', args: [id] }, 'Revoke approval', 'Mark the existing approval as revoked.')}>Revoke approval</button>}
          </section>
          <div className="panel form-panel" ref={verifyRef}>
            <form onSubmit={verify}>
              <div className="field-row"><h2><Fingerprint size={20} /> Verify text</h2>
                {!verifying && <Upload onText={text => { setCandidate(text); setResult(undefined); setVerificationError('') }} onError={setVerificationError} />}</div>
              <div className="field"><label htmlFor="candidate">Published text</label>
                <textarea id="candidate" value={candidate} rows={5} readOnly={verifying} placeholder="Paste the text exactly as published."
                  onChange={e => { setCandidate(e.target.value); setResult(undefined); setVerificationError('') }} /></div>
              {match && <button className="text-button" type="button" disabled={verifying} onClick={() => { setCandidate(draft.body); setResult(undefined); setVerificationError('') }}><ArrowDown size={15} /> Use draft text</button>}
              <ErrorText>{verificationError}</ErrorText>
              <button type="submit" className="button primary" disabled={verifying}>{verifying ? 'Checking…' : 'Check text'}</button>
              {result && <p role="status" className={'info ' + (result === 'match' && verifiedStatus === 2 ? 'success' : 'mismatch')}>
                {result === 'match' ? <Check size={17} /> : <X size={17} />}
                {result === 'mismatch' ? 'This text does not match.'
                  : verifiedStatus === 2 ? 'This text matches the approved version.' : 'This text matches. The receipt has no active approval.'}
              </p>}
            </form>
          </div>
        </div>
        <aside className="sidebar">
          <div className="aside-item"><ShieldCheck size={21} /><div><h3>On-chain receipt</h3>
            <p>BNB Smart Chain</p></div></div>
          <dl className="receipt-meta">
            <div><dt>Submitted by</dt><dd><ExplorerLink value={record.author}>{shortAddress(record.author)}</ExplorerLink></dd></div>
            <div><dt>Reviewer</dt><dd><ExplorerLink value={record.reviewer}>{shortAddress(record.reviewer)}</ExplorerLink></dd></div>
            {record.status !== 1 && <div><dt>Last decision</dt><dd>{displayDate(record.updatedAt)}</dd></div>}
            {history?.creation && <div><dt>Submission</dt><dd><ExplorerLink type="tx" value={history.creation}>View transaction</ExplorerLink></dd></div>}
            {history?.decision && <div><dt>Decision</dt><dd><ExplorerLink type="tx" value={history.decision}>View transaction</ExplorerLink></dd></div>}
            <div><dt>Fingerprint</dt><dd className="fingerprint">{record.digest}</dd></div>
          </dl>
          <div className="aside-share">
            <h3><Link2 size={17} /> Share</h3>
            <CopyButton value={bare} label="Copy public receipt" />
            {isAuthor && match && record.status === 1 && <>
              {share ? <CopyButton value={share} label="Copy review link" /> : <button className="button secondary" type="button" onClick={() => downloadText(draft.title, draft.body)}><Download size={16} /> Download draft</button>}
              <p className="hint">{share ? 'Anyone with the review link can read the draft.' : 'Send the draft file to your reviewer with the public receipt.'}</p>
            </>}
          </div>
        </aside>
      </div>
    </>}
  </section>
}
