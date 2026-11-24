import { keccak256, toBytes, type Address } from 'viem'
import { chain, deployment, parseId } from './chain'

export const maxBytes = 256_000
const encoder = new TextEncoder()
export type Draft = { title: string; body: string; previous?: string }

export const byteLength = (text: string) => encoder.encode(text).byteLength
export const normalize = (text: string) => text.replace(/\r\n?/g, '\n')
export const fingerprint = (text: string) => keccak256(toBytes(normalize(text)))

export function previousReceipt(search: string) {
  return parseId(new URLSearchParams(search).get('previous') ?? '')
}

export function receiptPath(id: bigint, previous?: bigint) {
  return '/requests/' + id + (previous ? '?previous=' + previous : '')
}

export function changedLines(before: string, after: string) {
  const left = normalize(before).split('\n')
  const right = normalize(after).split('\n')
  let start = 0
  let end = 0
  while (start < left.length && start < right.length && left[start] === right[start]) start++
  while (end < left.length - start && end < right.length - start
    && left[left.length - 1 - end] === right[right.length - 1 - end]) end++
  return { before: left.slice(start, left.length - end).join('\n'), after: right.slice(start, right.length - end).join('\n') }
}

const storagePrefix = () => 'relaymark/1/' + chain.id + '/' + deployment
const key = (id: bigint) => storagePrefix() + '/' + id

export function validDraft(input: unknown): input is Draft {
  if (input === null || typeof input !== 'object') return false
  const draft = input as Partial<Draft>
  return typeof draft.title === 'string' && draft.title.trim().length > 0 && draft.title.length <= 100
    && typeof draft.body === 'string' && draft.body.trim().length > 0 && byteLength(draft.body) <= maxBytes
    && (draft.previous === undefined || (typeof draft.previous === 'string' && Boolean(parseId(draft.previous))))
}

export function saveDraft(id: bigint, draft: Draft) {
  try { localStorage.setItem(key(id), JSON.stringify(draft)) } catch { /* Downloads remain available. */ }
}

export function savedDraft(id: bigint) {
  try {
    const raw = localStorage.getItem(key(id))
    const draft: unknown = raw ? JSON.parse(raw) : undefined
    return validDraft(draft) ? draft : undefined
  } catch { return undefined }
}

function base64Url(bytes: Uint8Array) {
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function transform(bytes: Uint8Array<ArrayBuffer>, mode: 'compress' | 'decompress') {
  const codec = mode === 'compress' ? new CompressionStream('gzip') : new DecompressionStream('gzip')
  const stream = new Blob([bytes]).stream().pipeThrough(codec)
  const reader = stream.getReader()
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > maxBytes * 2 + 512) {
      await reader.cancel()
      throw new Error('This draft is too large to open.')
    }
    chunks.push(Uint8Array.from(value))
  }
  return new Uint8Array(await new Blob(chunks).arrayBuffer())
}

export async function reviewFragment(draft: Draft) {
  const bytes = await transform(encoder.encode(JSON.stringify(draft)), 'compress')
  const encoded = base64Url(bytes)
  return encoded.length <= 6200 ? '#draft=' + encoded : undefined
}

export async function linkedDraft(hash: string) {
  if (!hash.startsWith('#draft=')) return undefined
  const payload = hash.slice(7)
  if (!/^[A-Za-z0-9_-]{1,6200}$/.test(payload)) throw new Error('This review link is incomplete.')
  const bytes = Uint8Array.from(atob(payload.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0))
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(await transform(bytes, 'decompress'))
  const draft: unknown = JSON.parse(decoded)
  if (!validDraft(draft)) throw new Error('This review link has an invalid draft.')
  return draft
}

export function parseReceipt(input: string) {
  const value = input.trim()
  const direct = parseId(value)
  if (direct) return { id: direct, fragment: '', previous: undefined }
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin) return undefined
    const search = new URLSearchParams(url.search)
    if ([...search.keys()].some(key => key !== 'previous') || search.getAll('previous').length > 1) return undefined
    const match = /^\/requests\/([^/]+)\/?$/.exec(url.pathname)
    const id = match && parseId(match[1])
    const previous = previousReceipt(url.search)
    return id ? { id, previous: previous && previous < id ? previous : undefined, fragment: url.hash.startsWith('#draft=') ? url.hash : '' } : undefined
  } catch { return undefined }
}

export async function readText(file: File) {
  if (file.size > maxBytes) throw new Error('Choose a text file smaller than 250 KB.')
  return normalize(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()))
}

export function downloadText(title: string, body: string) {
  const blob = new Blob([normalize(body)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = (title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 64) || 'approved-text') + '.md'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function compositionKey(account: Address, previous?: bigint) {
  return storagePrefix() + '/draft/' + account + (previous ? '/' + previous : '')
}

export function readComposition(account?: Address, previous?: bigint) {
  if (!account) return
  try {
    const value = JSON.parse(localStorage.getItem(compositionKey(account, previous)) ?? 'null') as unknown
    if (!value || typeof value !== 'object') return
    const draft = value as { title?: unknown; body?: unknown; reviewer?: unknown }
    if (typeof draft.title === 'string' && typeof draft.body === 'string' && typeof draft.reviewer === 'string') {
      return { title: draft.title, body: draft.body, reviewer: draft.reviewer }
    }
  } catch { /* The editor still works without storage. */ }
}

export function writeComposition(account: Address, data?: Draft & { reviewer: string }, previous?: bigint) {
  try {
    const key = compositionKey(account, previous)
    if (data) localStorage.setItem(key, JSON.stringify(data))
    else localStorage.removeItem(key)
  } catch { /* The editor still works without storage. */ }
}
