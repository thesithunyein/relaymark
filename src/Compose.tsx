import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, FileLock2, UserRoundCheck } from 'lucide-react'
import type { Address, EIP1193Provider } from 'viem'
import { addressInput, checkGas, createdId, deployment, getRecord, hasAgentId, message, parseId, prepareWallet, sameAddress, type RecordData } from './chain'
import { byteLength, fingerprint, maxBytes, normalize, readComposition, receiptPath, savedDraft, saveDraft, writeComposition } from './documents'
import { ErrorText, Upload } from './ui'
import { useWallet } from './wallet'
import type { Transaction } from './transaction'

type Fields = { title: string; reviewer: string; body: string }
type Checked = { author: Address; reviewer: Address; provider?: EIP1193Provider }

export function Compose({ setAction }: { setAction: (action: Transaction) => void }) {
  const { search } = useLocation()
  const previousId = parseId(new URLSearchParams(search).get('from') ?? '')
  return <ComposeForm key={previousId?.toString() ?? 'new'} previousId={previousId} setAction={setAction} />
}

function ComposeForm({ previousId, setAction }: { previousId?: bigint; setAction: (action: Transaction) => void }) {
  const { active, setOpen } = useWallet()
  const navigate = useNavigate()
  const [values, setValues] = useState<Fields>(() => readComposition(active?.account, previousId) ?? { title: '', reviewer: '', body: '' })
  const [errors, setErrors] = useState<Partial<Fields>>({})
  const [previous, setPrevious] = useState<RecordData>()
  const [previousError, setPreviousError] = useState('')
  const [checked, setChecked] = useState<Checked>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const reviewer = addressInput(values.reviewer)
  const ready = Boolean(checked && active && checked.provider === active.provider
    && sameAddress(checked.author, active.account) && sameAddress(checked.reviewer, reviewer))

  useEffect(() => {
    const saved = readComposition(active?.account, previousId)
    if (saved) setValues(draft => ({
      reviewer: draft.reviewer || saved.reviewer,
      title: draft.title || saved.title,
      body: draft.body || saved.body,
    }))
  }, [active?.account, previousId])

  useEffect(() => {
    if (!previousId) return
    let current = true
    getRecord(previousId).then(record => {
      if (!current) return
      if (!record.status || record.status === 1) {
        setPreviousError('This request is unavailable for revision.')
        return
      }
      setPrevious(record)
      const prior = savedDraft(previousId)
      setValues(draft => ({
        reviewer: record.reviewer,
        title: draft.title || (prior && fingerprint(prior.body) === record.digest ? prior.title : ''),
        body: draft.body || (prior && fingerprint(prior.body) === record.digest ? prior.body : ''),
      }))
    }).catch(error => { if (current) setPreviousError(message(error)) })
    return () => { current = false }
  }, [previousId])

  function field(key: keyof Fields, content: string) {
    const next = { ...values, [key]: content }
    setValues(next)
    setErrors(current => ({ ...current, [key]: '' }))
    if (key === 'reviewer') setChecked(undefined)
    if (active?.account) writeComposition(active.account, next, previousId)
  }

  async function preflight(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!active) { setOpen(true); return }
    if (previousId && (!previous || !sameAddress(previous.author, active.account))) {
      setError('Use the original sender’s wallet to submit a revision.')
      return
    }
    if (!reviewer || sameAddress(reviewer, active.account)) {
      setErrors({ reviewer: reviewer ? 'Choose a different reviewer.' : 'Enter a valid reviewer wallet address.' })
      document.getElementById('compose-reviewer')?.focus()
      return
    }
    setBusy(true)
    try {
      const [isAuthor, isReviewer] = await Promise.all([hasAgentId(active.account), hasAgentId(reviewer)])
      if (!isAuthor) throw new Error('Connect the wallet that holds your Agent ID.')
      if (!isReviewer) {
        setErrors({ reviewer: 'Ask your reviewer for the wallet address that holds their Agent ID.' })
        document.getElementById('compose-reviewer')?.focus()
        return
      }
      await checkGas(active.account, { functionName: 'request', args: [reviewer, fingerprint('Relaymark wallet check')] })
      if (active.provider) await prepareWallet(active.provider, active.account)
      setChecked({ author: active.account, reviewer, provider: active.provider })
    } catch (error) { setError(message(error)) }
    finally { setBusy(false) }
  }

  function formSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!ready || !reviewer || !active || !deployment) return
    const title = values.title.trim()
    const body = normalize(values.body)
    const invalid: Partial<Fields> = {}
    if (!title) invalid.title = 'Give this request a title.'
    if (!body.trim()) invalid.body = 'Paste or upload the text to review.'
    else if (byteLength(body) > maxBytes) invalid.body = 'Keep the draft under 250 KB.'
    else if (previous && fingerprint(body) === previous.digest) invalid.body = 'Edit the draft before sending a revised version.'
    setErrors(invalid)
    const first = Object.keys(invalid)[0]
    if (first) { document.getElementById('compose-' + first)?.focus(); return }
    const author = active.account
    setAction({
      intent: { functionName: 'request', args: [reviewer, fingerprint(body)] },
      title: 'Send review request',
      description: 'Record the draft fingerprint and the reviewer’s address.',
      onSuccess: receipt => {
        const id = createdId(receipt)
        saveDraft(id, { title, body, previous: previousId?.toString() })
        writeComposition(author, undefined, previousId)
        navigate(receiptPath(id, previousId), { state: { justCreated: true } })
      },
    })
  }

  const title = previousId ? 'Send revised version' : 'New request'

  return <section className="inner-page">
    <Link className="back" to={previousId ? receiptPath(previousId) : '/'}><ArrowLeft size={16} /> {previousId ? 'Original receipt' : 'Workspace'}</Link>
    <div className="page-heading"><h1>{title}</h1><p>{previousId ? 'Send the updated text for a fresh decision.' : 'Send one version to one reviewer.'}</p></div>
    <div className="work-grid">
      <div className="receipt-content">
        <form className="panel form-panel" noValidate onSubmit={preflight}>
          <div className="field-row"><h2><UserRoundCheck size={20} /> Wallet check</h2>{ready && <span className="status status-2"><Check size={14} /> Ready</span>}</div>
          <p className="hint">Both wallets need an Agent ID. The sender pays the BNB network fee.</p>
          <div className="field wallet-check-field">
            <label htmlFor="compose-reviewer">Reviewer wallet</label>
            <input id="compose-reviewer" value={values.reviewer} spellCheck={false} autoComplete="off" className="mono-input" aria-invalid={!!errors.reviewer}
              aria-describedby={errors.reviewer ? 'reviewer-error' : 'reviewer-help'} onChange={e => field('reviewer', e.target.value)}
              placeholder="0x…" disabled={busy} readOnly={Boolean(previousId)} />
            {errors.reviewer ? <p className="error" id="reviewer-error" role="alert">{errors.reviewer}</p>
              : <p className="hint" id="reviewer-help">Use the address that holds their Agent ID.</p>}
          </div>
          <ErrorText>{previousError || error}</ErrorText>
          {!ready && <button className="button primary wallet-check-button" type="submit"
            disabled={busy || !deployment || Boolean(previousId && !previous)} aria-busy={busy}>
            {busy ? 'Checking wallets…' : active ? 'Check wallets' : 'Connect wallet'} <ArrowRight size={17} />
          </button>}
        </form>
        {ready && <form className="panel form-panel" noValidate onSubmit={formSubmit}>
          <div className="field">
            <label htmlFor="compose-title">Title</label>
            <input id="compose-title" value={values.title} maxLength={100} aria-invalid={!!errors.title} aria-describedby={errors.title ? 'title-error' : undefined}
              onChange={e => field('title', e.target.value)} placeholder="Partnership announcement" />
            {errors.title && <p className="error" id="title-error">{errors.title}</p>}
          </div>
          <div className="field">
            <div className="field-row"><label htmlFor="compose-body">Text to review</label><Upload onText={text => field('body', text)} onError={setError} /></div>
            <textarea id="compose-body" value={values.body} rows={11} aria-invalid={!!errors.body} aria-describedby={errors.body ? 'body-error' : undefined}
              onChange={e => field('body', e.target.value)} placeholder="Paste the exact text you plan to publish." />
            {errors.body && <p className="error" id="body-error">{errors.body}</p>}
          </div>
          <div className="form-actions"><Link to={previousId ? receiptPath(previousId) : '/'} className="button quiet">Cancel</Link>
            <button className="button primary" type="submit">{previousId ? 'Request new approval' : 'Request approval'} <ArrowRight size={17} /></button>
          </div>
        </form>}
      </div>
      <aside className="sidebar">
        <div className="aside-item"><FileLock2 size={20} /><div><h3>Your draft stays off-chain</h3><p>Only a fingerprint and wallet addresses go on-chain. Share the draft through a channel you trust.</p></div></div>
        <div className="aside-item"><UserRoundCheck size={20} /><div><h3>One designated reviewer</h3><p>Only the wallet you choose can approve this version. Changes need a fresh approval.</p></div></div>
      </aside>
    </div>
  </section>
}
