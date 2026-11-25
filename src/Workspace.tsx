import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, FileText, Fingerprint, Plus, RefreshCw } from 'lucide-react'
import { deployment, listRequests, message, sameAddress, shortAddress } from './chain'
import { savedDraft } from './documents'
import { ErrorText, Status } from './ui'
import { Landing } from './Landing'
import { useWallet } from './wallet'

type Page = Awaited<ReturnType<typeof listRequests>>
const filters = ['All', 'Sent', 'Received'] as const

export function Workspace() {
  const { active } = useWallet()
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

  if (!account) return <Landing />

  return <section className="workspace" aria-labelledby="workspace-title">
    <div className="workspace-overview">
      <div><h1 id="workspace-title">Your requests</h1><p>Review drafts and track decisions.</p></div>
      <div className="workspace-actions">
        <Link to="/verify" className="button secondary"><Fingerprint size={16} /> Verify a receipt</Link>
        <Link to="/new" className="button primary"><Plus size={16} /> New request</Link>
      </div>
    </div>
    <div className="request-panel">
      <div className="request-toolbar">
        <div className="tabs" role="group" aria-label="Request filters">
          {filters.map(item => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <button className="icon-button" type="button" aria-label="Refresh requests" title="Refresh requests"
          onClick={() => setRefresh(i => i + 1)} disabled={busy}><RefreshCw size={17} aria-hidden="true" /></button>
      </div>
      <ErrorText>{error}</ErrorText>
      {busy && !page && <div role="status" aria-label="Loading requests"><div className="skeleton" /><div className="skeleton" /></div>}
      {visible.length > 0 && <ul className="request-list">
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
      {!busy && !error && visible.length === 0 && <div className="empty">
        <span className="icon-block"><FileText size={21} aria-hidden="true" /></span>
        <div><h3>{filter === 'All' ? 'No requests yet' : filter === 'Sent' ? 'Nothing sent yet' : 'Nothing received yet'}</h3>
          <p>{filter === 'Received' ? 'Requests sent to your wallet appear here.' : 'Send a draft when you’re ready for a decision.'}</p></div>
      </div>}
      {!!page?.next && <button className="button secondary more" type="button" onClick={more} disabled={busy}>{busy ? 'Loading…' : 'Load more'}</button>}
    </div>
  </section>
}
