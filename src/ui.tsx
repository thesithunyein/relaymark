import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowUpRight, Check, Copy, X } from 'lucide-react'
import { labels, explorer } from './chain'
import { readText } from './documents'

export const walletGuide = 'https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/external-sign.md'

const markSource = '/favicon.svg'

export function Mark({ className = '' }: { className?: string }) {
  return <img className={className} src={markSource} width="36" height="36" alt="" />
}

export function ReceiptArt() {
  return <svg className="receipt-art" viewBox="0 0 330 164" fill="none" aria-hidden="true">
    <rect x="28" y="38" width="116" height="104" rx="18" fill="#cfdfa0" stroke="#a5b779" />
    <path d="M47 66h43m-43 15h62m-62 15h49" stroke="#84985f" strokeWidth="3" strokeLinecap="round" />
    <path d="M95 57h32m-7-7 7 7-7 7" stroke="#547043" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="134" y="13" width="152" height="132" rx="19" fill="#b5c884" />
    <rect x="128" y="8" width="152" height="132" rx="19" fill="#fbfcf7" stroke="#a5b779" />
    <image href={markSource} x="146" y="22" width="34" height="34" />
    <path d="M148 72h106" stroke="#dce0d4" />
    <path d="M148 88h62m-62 13h79m-79 13h48" stroke="#a7b59d" strokeWidth="3" strokeLinecap="round" />
    <rect x="249" y="100" width="53" height="53" rx="16" fill="#263e32" />
    <path d="m265 127 7 7 14-15" stroke="#d9e8a9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

export function Status({ status }: { status: number }) {
  return <span className={'status status-' + status}><i />{labels[status] ?? 'Unknown'}</span>
}

export function ErrorText({ children }: { children?: ReactNode }) {
  return children ? <p className="error" role="alert">{children}</p> : null
}

export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); close() }}>
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2>
      <button className="icon-button" type="button" onClick={close} aria-label="Close"><X size={18} /></button>
    </div>
    {children}
  </dialog>
}

export function CopyButton({ value, label, className = 'button secondary' }: { value: string; label: string; className?: string }) {
  const [state, setState] = useState('')
  useEffect(() => {
    if (!state) return
    const timer = window.setTimeout(() => setState(''), 2200)
    return () => clearTimeout(timer)
  }, [state])
  return <><button type="button" className={className} onClick={async () => {
    try {
      await navigator.clipboard.writeText(value)
      setState('Copied')
    } catch { setState('Could not copy') }
  }}>{state === 'Copied' ? <Check size={16} /> : <Copy size={16} />} {state || label}</button>
  {state === 'Could not copy' && <input className="copy-fallback" readOnly value={value} aria-label={label} onFocus={e => e.target.select()} />}</>
}

export function Upload({ onText, onError }: { onText: (text: string, name: string) => void; onError: (text: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  return <><button type="button" className="text-button" onClick={() => input.current?.click()}>
    <ArrowDownToLine size={15} /> Open text file
  </button><input ref={input} type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" hidden onChange={async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try { onText(await readText(file), file.name) }
    catch (error) { onError(error instanceof Error ? error.message : 'Could not read this file.') }
  }} /></>
}

export function ExplorerLink({ value, type = 'address', children }: {
  value: string; type?: 'address' | 'tx'; children: ReactNode
}) {
  return <a className="inline-link" target="_blank" rel="noopener noreferrer" href={explorer + '/' + type + '/' + value}>
    {children}<ArrowUpRight size={13} />
  </a>
}
