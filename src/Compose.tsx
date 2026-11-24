import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, FileLock2, UserRoundCheck } from 'lucide-react'
import { addressInput, createdId, deployment, hasAgentId, message, sameAddress } from './chain'
import { byteLength, fingerprint, maxBytes, normalize, readComposition, saveDraft, writeComposition } from './documents'
import { ErrorText, Upload } from './ui'
import { useWallet } from './wallet'
import type { Transaction } from './transaction'

type Fields = { title: string; reviewer: string; body: string }

export function Compose({ setAction }: { setAction: (action: Transaction) => void }) {
  const { active, setOpen } = useWallet()
  const navigate = useNavigate()
  const [values, setValues] = useState<Fields>(() => readComposition(active?.account) ?? { title: '', reviewer: '', body: '' })
  const [errors, setErrors] = useState<Partial<Fields>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function field(key: keyof Fields, content: string) {
    const next = { ...values, [key]: content }
    setValues(next)
    setErrors(current => ({ ...current, [key]: '' }))
    if (active?.account) writeComposition(active.account, next)
  }

  async function formSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const title = values.title.trim()
    const reviewer = addressInput(values.reviewer)
    const body = normalize(values.body)
    const invalid: Partial<Fields> = {}
    if (!title) invalid.title = 'Give this request a title.'
    if (!reviewer) invalid.reviewer = 'Enter a valid reviewer wallet address.'
    else if (sameAddress(reviewer, active?.account)) invalid.reviewer = 'Choose a different reviewer.'
    if (!body.trim()) invalid.body = 'Paste or upload the text to review.'
    else if (byteLength(body) > maxBytes) invalid.body = 'Keep the draft under 250 KB.'
    setErrors(invalid)
    const first = Object.keys(invalid)[0]
    if (first) {
      document.getElementById('compose-' + first)?.focus()
      return
    }
    if (!active) { setOpen(true); return }
    if (!reviewer || !deployment) return
    const author = active.account
    setBusy(true)
    try {
      const [isAuthor, isReviewer] = await Promise.all([hasAgentId(author), hasAgentId(reviewer)])
      if (!isAuthor) throw new Error('Use the wallet address that holds your Agent ID.')
      if (!isReviewer) {
        setErrors({ reviewer: 'This wallet does not hold an Agent ID.' })
        document.getElementById('compose-reviewer')?.focus()
        return
      }
      setAction({
        intent: { functionName: 'request', args: [reviewer, fingerprint(body)] },
        title: 'Send review request',
        description: 'Record the draft fingerprint and the reviewer’s address.',
        onSuccess: receipt => {
          const id = createdId(receipt)
          saveDraft(id, { title, body })
          writeComposition(author)
          navigate('/requests/' + id, { state: { justCreated: true } })
        },
      })
    } catch (error) { setError(message(error)) }
    finally { setBusy(false) }
  }

  return <section className="inner-page">
    <Link className="back" to="/"><ArrowLeft size={16} /> Workspace</Link>
    <div className="page-heading"><h1>New request</h1><p>Send one version to one reviewer.</p></div>
    <div className="work-grid">
      <form className="panel form-panel" noValidate onSubmit={formSubmit}>
        <div className="field">
          <label htmlFor="compose-title">Title</label>
          <input id="compose-title" value={values.title} maxLength={100} aria-invalid={!!errors.title} aria-describedby={errors.title ? 'title-error' : undefined}
            onChange={e => field('title', e.target.value)} placeholder="Partnership announcement" />
          {errors.title && <p className="error" id="title-error">{errors.title}</p>}
        </div>
        <div className="field">
          <label htmlFor="compose-reviewer">Reviewer wallet</label>
          <input id="compose-reviewer" value={values.reviewer} spellCheck={false} autoComplete="off" className="mono-input" aria-invalid={!!errors.reviewer}
            aria-describedby={errors.reviewer ? 'reviewer-error' : 'reviewer-help'} onChange={e => field('reviewer', e.target.value)} placeholder="0x…" />
          {errors.reviewer ? <p className="error" id="reviewer-error">{errors.reviewer}</p>
            : <p className="hint" id="reviewer-help">Use the address that holds their Agent ID.</p>}
        </div>
        <div className="field">
          <div className="field-row"><label htmlFor="compose-body">Text to review</label><Upload onText={text => field('body', text)} onError={setError} /></div>
          <textarea id="compose-body" value={values.body} rows={11} aria-invalid={!!errors.body} aria-describedby={errors.body ? 'body-error' : undefined}
            onChange={e => field('body', e.target.value)} placeholder="Paste the exact text you plan to publish." />
          {errors.body && <p className="error" id="body-error">{errors.body}</p>}
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="form-actions"><Link to="/" className="button quiet">Cancel</Link>
          <button className="button primary" type="submit" aria-busy={busy} disabled={busy || !deployment}>
            {busy ? 'Checking wallets…' : active ? 'Request approval' : 'Connect wallet'} <ArrowRight size={17} />
          </button></div>
      </form>
      <aside className="sidebar">
        <div className="aside-item"><FileLock2 size={20} /><div><h3>Your draft stays off-chain</h3><p>Only a fingerprint and wallet addresses go on-chain. Send the draft through a channel you trust.</p></div></div>
        <div className="aside-item"><UserRoundCheck size={20} /><div><h3>One designated reviewer</h3><p>Only the wallet you choose can approve this version. Changes need a new request.</p></div></div>
      </aside>
    </div>
  </section>
}
