import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Fingerprint, ShieldCheck } from 'lucide-react'
import { parseReceipt, receiptPath } from './documents'
import { deployment } from './chain'

export function ReceiptLookup({ embedded = false }: { embedded?: boolean }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const field = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const id = embedded ? 'home-receipt-id' : 'receipt-id'

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseReceipt(input)
    if (!parsed) {
      setError('Enter a Relaymark receipt link or request number.')
      field.current?.focus()
      return
    }
    navigate(receiptPath(parsed.id, parsed.previous) + (parsed.fragment || '#verify'))
  }

  return <form className={embedded ? 'receipt-lookup embedded' : 'panel form-panel receipt-lookup'} onSubmit={submit}>
    {!embedded && <span className="icon-block"><Fingerprint size={23} aria-hidden="true" /></span>}
    <div className="field">
      <label htmlFor={id}>Receipt link or request number</label>
      <div className="lookup-controls">
        <input ref={field} id={id} value={input} placeholder="Paste the receipt link" autoComplete="off" spellCheck={false}
          aria-invalid={!!error} aria-describedby={error ? id + '-error' : undefined} onChange={e => { setInput(e.target.value); setError('') }} />
        <button type="submit" className={embedded ? 'button secondary' : 'button primary'} disabled={!deployment}>
          Open receipt <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
      {error && <p id={id + '-error'} className="error" role="alert">{error}</p>}
    </div>
  </form>
}

export function Verify() {
  return <section className="inner-page verify-page">
    <Link className="back" to="/"><ArrowLeft size={16} /> Workspace</Link>
    <div className="page-heading"><h1>Verify a receipt</h1><p>Check whether published text matches an approved version.</p></div>
    <ReceiptLookup />
    <p className="verify-note"><ShieldCheck size={18} /> Verification works without a wallet.</p>
  </section>
}
