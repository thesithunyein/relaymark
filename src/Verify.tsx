import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, FileCheck2, ShieldCheck } from 'lucide-react'
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

  return <form className="receipt-lookup" onSubmit={submit}>
    <div className="field">
      <label htmlFor={id}>Receipt link or request number</label>
      <div className="lookup-controls">
        <input ref={field} id={id} value={input} placeholder="Paste a link or enter a number" autoComplete="off" spellCheck={false}
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
  return <section className="resource-page verify-page" aria-labelledby="verify-title">
    <header className="resource-intro">
      <h1 id="verify-title">Verify a receipt</h1>
      <p>Check whether published text matches the approved version.</p>
      <Link className="button secondary" to="/docs#verify">How verification works <ArrowRight size={16} aria-hidden="true" /></Link>
    </header>
    <section className="resource-panel verify-lookup" aria-labelledby="verify-lookup-title">
      <div className="lookup-heading">
        <h2 id="verify-lookup-title">Receipt lookup</h2>
        <FileCheck2 className="lookup-art" size={27} aria-hidden="true" />
      </div>
      <ReceiptLookup />
      <p className="verify-note"><ShieldCheck size={17} aria-hidden="true" /> No wallet needed to verify.</p>
    </section>
  </section>
}
