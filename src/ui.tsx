import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowUpRight, Check, Copy, X } from 'lucide-react'
import { labels, explorer } from './chain'
import { readText } from './documents'

export const walletGuide = 'https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/external-sign.md'

export function Mark({ className = '' }: { className?: string }) {
  return <img className={className} src="/favicon.svg" width="35" height="35" alt="" />
}

export function ReceiptArt() {
  return <svg className="receipt-art" viewBox="72 38 410 302" fill="none" aria-hidden="true">
    <defs>
      <pattern id="graph" width="25" height="25" patternUnits="userSpaceOnUse">
        <path d="M25 0H0v25" stroke="#cdd3be" strokeOpacity=".55"/>
      </pattern>
      <linearGradient id="paper" x1="99" x2="312" y1="52" y2="332" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fffef8"/><stop offset="1" stopColor="#efeee0"/>
      </linearGradient>
      <filter id="shadow" x="-30%" y="-25%" width="160%" height="175%">
        <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#37452f" floodOpacity=".15"/>
      </filter>
    </defs>
    <rect x="72" y="38" width="410" height="302" rx="28" fill="url(#graph)" opacity=".55"/>
    <circle cx="277" cy="181" r="147" stroke="#aebc9f" strokeOpacity=".7" strokeDasharray="2 6"/>
    <circle cx="277" cy="181" r="109" stroke="#b8c4a8" strokeOpacity=".73"/>
    <path d="M109 214h29m-15-15v30m296-91h25m-12-12v24" stroke="#a0ae90" strokeLinecap="round"/>
    <g transform="translate(142 92) rotate(-13 72 104)" filter="url(#shadow)">
      <rect width="149" height="205" rx="12" fill="#e2ead7" stroke="#a8b79a"/>
      <rect x="11" y="11" width="127" height="183" rx="7" stroke="#b6c4a9"/>
      <path d="M27 47h47m-47 21h92m-92 12h76m-76 12h82m-82 25h90m-90 12h64" stroke="#a3b494" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M27 166h29" stroke="#a3b494" strokeWidth="2.5" strokeLinecap="round"/>
    </g>
    <g transform="translate(244 68) rotate(10 77 110)" filter="url(#shadow)">
      <rect width="156" height="223" rx="12" fill="url(#paper)" stroke="#b7c3a5"/>
      <rect x="11" y="11" width="134" height="201" rx="7" stroke="#d8ddcc"/>
      <path d="M30 53h52" stroke="#2e4638" strokeWidth="4" strokeLinecap="round"/>
      <path d="M30 74h96m-96 13h81m-81 13h90m-90 25h89m-89 13h74" stroke="#b4bca6" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M30 178h94" stroke="#d0d7c1" strokeDasharray="3 4"/>
      <path d="M31 189h38" stroke="#a8b69b" strokeWidth="2.5" strokeLinecap="round"/>
    </g>
    <g transform="translate(316 221)" filter="url(#shadow)">
      <path d="m37 0 9 6 11 1 5 10 9 7-1 11 4 10-7 8-3 11-11 2-8 8-10-4-11 1-7-9-10-4-1-11-6-9 5-10 1-10 10-5 6-10 11 1Z" fill="#cadb9c" stroke="#78915d"/>
      <circle cx="37" cy="37" r="26" stroke="#8ca16b" strokeDasharray="2 3"/>
      <path d="m25 37 8 8 16-17" stroke="#324936" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    <circle cx="119" cy="111" r="3" fill="#94a784"/><circle cx="440" cy="250" r="3.5" fill="#94a784"/>
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
