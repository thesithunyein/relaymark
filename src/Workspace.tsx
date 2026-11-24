import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, FileText, Plus, RefreshCw } from 'lucide-react'
import { deployment, listRequests, message, sameAddress, shortAddress } from './chain'
import { savedDraft } from './documents'
import { ErrorText, Status } from './ui'
import { Landing } from './Landing'
import { useWallet } from './wallet'

type Page = Awaited<ReturnType<typeof listRequests>>
const filters = ['All', 'Sent', 'Received'] as const

export function Workspace() {
  const { active, setOpen } = useWallet()
  const account = active?.account
  const [page, setPage] = useState<Page>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')

  useEffect(() => {
    let current = true
    setPage(undefined)
    setError('')
    setBusy(Boolean(account && deployment))
    if (account && deployment) {
      listRequests(account).then(data => { if (current) setPage(data) })
        .catch(error => { if (current) setError(message(error)) })
        .finally(() => { if (current) setBusy(false) })
    }
    return () => { current = false }
  }, [account, refresh])

  async function more() {
    if (!account || !page?.next) return
    const cursor = page.next
    setBusy(true)
    setError('')
    try {
      const response = await listRequests(account, cursor)
      setPage(current => current?.next === cursor ? { next: response.next, records: [...current.records, ...response.records] } : current)
    } catch (error) { setError(message(error)) }
    finally { setBusy(false) }
  }

  const visible = page?.records.filter(({ record }) => filter === 'All'
    || (filter === 'Sent' ? sameAddress(record.author, account) : sameAddress(record.reviewer, account))) ?? []

  if (!account) return <Landing connect={() => setOpen(true)} />

  return <section className="workspace" aria-labelledby="workspace-title">
      <div className="section-heading">
        <div><h2 id="workspace-title">Your requests</h2><p>Review drafts and track decisions in one place.</p></div>
        <div className="workspace-actions">
          <button className="button secondary" type="button" onClick={() => setRefresh(i => i + 1)} disabled={busy}><RefreshCw size={16} /> Refresh</button>
          <Link to="/new" className="button primary"><Plus size={16} /> New request</Link>
        </div>
      </div>
      <div className="tabs" aria-label="Request filters">
        {filters.map(item => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      <ErrorText>{error}</ErrorText>
      {busy && !page && <div className="request-panel" role="status"><div className="skeleton" /><div className="skeleton" /></div>}
      {visible.length > 0 && <ul className="request-panel request-list">
        {visible.map(({ id, record }) => {
          const sent = sameAddress(account, record.author)
          const local = savedDraft(id)
          return <li key={id.toString()}>
            <Link to={'/requests/' + id} className="request-row">
              <span className="icon-block">{sent ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}</span>
              <span className="request-name"><strong>{local?.title || 'Request #' + id}</strong>
                <span>{sent ? 'To ' : 'From '}{shortAddress(sent ? record.reviewer : record.author)}</span></span>
              <Status status={record.status} /><ArrowRight className="row-arrow" size={17} />
            </Link>
          </li>
        })}
      </ul>}
      {!busy && !error && visible.length === 0 && <div className="request-panel empty">
        <span className="icon-block"><FileText size={21} /></span>
        <div><h3>No requests here yet</h3>
          <p>Send a draft to get a recorded decision.</p></div>
      </div>}
      {!!page?.next && <button className="button secondary more" type="button" onClick={more} disabled={busy}>{busy ? 'Loading…' : 'Load more'}</button>}
    </section>
}
