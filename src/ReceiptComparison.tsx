import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, GitCompareArrows } from 'lucide-react'
import { getRecord, message, sameAddress, type RecordData } from './chain'
import { changedLines, fingerprint, receiptPath, savedDraft } from './documents'
import { ErrorText, Status, Upload } from './ui'

export function ReceiptComparison({ previous, current, currentText }: {
  previous: bigint; current: RecordData; currentText: string
}) {
  const [prior, setPrior] = useState<RecordData>()
  const [priorText, setPriorText] = useState(() => savedDraft(previous)?.body ?? '')
  const [error, setError] = useState('')
  const [fileError, setFileError] = useState('')
  const [retry, setRetry] = useState(0)
  const valid = Boolean(prior?.status && sameAddress(prior.author, current.author) && sameAddress(prior.reviewer, current.reviewer))
  const previousMatches = Boolean(valid && priorText && fingerprint(priorText) === prior?.digest)
  const changes = useMemo(() => previousMatches && currentText ? changedLines(priorText, currentText) : undefined,
    [previousMatches, priorText, currentText])

  useEffect(() => {
    let mounted = true
    setError('')
    getRecord(previous).then(record => {
      if (mounted) setPrior(record)
    }).catch(error => { if (mounted) setError(message(error)) })
    return () => { mounted = false }
  }, [previous, retry])

  return <section className="panel form-panel">
    <div className="field-row"><h2><GitCompareArrows size={20} /> Compare versions</h2></div>
    {error ? <><ErrorText>{error}</ErrorText><button className="button secondary" type="button" onClick={() => setRetry(n => n + 1)}>Try again</button></>
      : !prior ? <p className="hint" role="status">Loading earlier receipt…</p>
      : !valid ? <p className="hint">This earlier receipt could not be matched to the same sender and reviewer.</p>
      : <>
        <div className="comparison-meta">
          <div><Link className="inline-link" to={receiptPath(previous)}>Earlier receipt #{previous.toString()} <ArrowUpRight size={13} /></Link><Status status={prior.status} /></div>
          <div><strong>This receipt</strong><Status status={current.status} /></div>
        </div>
        {changes ? (priorText === currentText
          ? <p className="hint">The text matches in both versions.</p>
          : <div className="comparison-grid">
            <div><h3>Before</h3><pre className="paper-text before">{changes.before}</pre></div>
            <div><h3>After</h3><pre className="paper-text after">{changes.after}</pre></div>
          </div>) : <>
          {!currentText && <p className="hint">Open or paste the current draft above to compare its text.</p>}
          {!previousMatches && <><p className="hint">Upload the earlier text to compare it against its recorded fingerprint.</p>
            <Upload onText={text => { setPriorText(text); setFileError('') }} onError={setFileError} />
            <ErrorText>{fileError || (priorText && !previousMatches ? 'This file does not match the earlier receipt.' : '')}</ErrorText></>}
        </>}
        <p className="hint">The link selects the receipts to compare. Each receipt records its own decision on-chain.</p>
      </>}
  </section>
}
