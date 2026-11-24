import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Fingerprint, ShieldCheck } from 'lucide-react'
import { parseReceipt } from './documents'
import { ErrorText } from './ui'
import { deployment } from './chain'

export function Verify() {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseReceipt(input)
    if (!parsed) { setError('Enter a Relaymark receipt link or request number.'); return }
    navigate('/requests/' + parsed.id + parsed.fragment + (parsed.fragment ? '' : '#verify'))
  }

  return <section className="inner-page verify-page">
    <Link className="back" to="/"><ArrowLeft size={16} /> Workspace</Link>
    <div className="page-heading"><h1>Verify a receipt</h1><p>Check whether published text matches an approved version.</p></div>
    <form className="panel form-panel" onSubmit={submit}>
      <span className="icon-block"><Fingerprint size={23} /></span>
      <div className="field"><label htmlFor="receipt-id">Receipt link or request number</label>
        <input id="receipt-id" value={input} placeholder="Paste the receipt link" autoComplete="off" spellCheck={false}
          aria-invalid={!!error} aria-describedby={error ? 'verify-error' : undefined} onChange={e => { setInput(e.target.value); setError('') }} />
        {error && <p id="verify-error" className="error" role="alert">{error}</p>}
      </div>
      <button type="submit" className="button primary" disabled={!deployment}>Open receipt <ArrowRight size={17} /></button>
    </form>
    <p className="verify-note"><ShieldCheck size={18} /> Verification works without a wallet.</p>
  </section>
}
