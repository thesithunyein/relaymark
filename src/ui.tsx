import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowUpRight, Check, Copy, X } from 'lucide-react'
import { labels, explorer } from './chain'
import { readText } from './documents'

export const walletGuide = 'https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/external-sign.md'

const markSource = '/favicon.svg'

export function Mark({ className = '' }: { className?: string }) {
  return <img className={className} src={markSource} width="36" height="36" alt="" />
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
