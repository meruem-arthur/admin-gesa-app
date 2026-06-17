import React, { useEffect, useState } from 'react'
import { getReports, resolveReport, reopenReport, deleteReport } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

function timeAgo(val) {
  if (!val) return ''
  const d = val.toDate ? val.toDate() : new Date(val)
  const mins = Math.floor((Date.now() - d) / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)   return `${days}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ReportsPage() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('open') // 'open' | 'resolved' | 'all'
  const { show, Toast }       = useToast()

  const load = async () => { setLoading(true); setList(await getReports()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleResolve(id) {
    await resolveReport(id); await load(); show('Marked as resolved.')
  }
  async function handleReopen(id) {
    await reopenReport(id); await load(); show('Reopened.')
  }
  async function handleDelete(id) {
    if (!confirm('Delete this report permanently?')) return
    await deleteReport(id); await load(); show('Deleted.')
  }

  const openCount     = list.filter(r => r.status !== 'resolved').length
  const resolvedCount = list.filter(r => r.status === 'resolved').length

  const filtered = list.filter(r => {
    if (filter === 'open')     return r.status !== 'resolved'
    if (filter === 'resolved') return r.status === 'resolved'
    return true
  })

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Reports</h1>
      <p style={s.sub}>Anonymous issues and concerns submitted by students through the app.</p>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={s.statChip}>
          <span style={{ ...s.statNum, color: 'var(--amber)' }}>{openCount}</span>
          <span style={s.statLbl}>Open</span>
        </div>
        <div style={s.statChip}>
          <span style={{ ...s.statNum, color: 'var(--green)' }}>{resolvedCount}</span>
          <span style={s.statLbl}>Resolved</span>
        </div>
        <div style={s.statChip}>
          <span style={{ ...s.statNum, color: 'var(--purple2)' }}>{list.length}</span>
          <span style={s.statLbl}>Total</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="chip-group" style={{ marginBottom: 20 }}>
        {[
          { key: 'open',     label: `Open (${openCount})` },
          { key: 'resolved', label: `Resolved (${resolvedCount})` },
          { key: 'all',      label: 'All' },
        ].map(f => (
          <span
            key={f.key}
            className={`chip${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </span>
        ))}
      </div>

      {/* List */}
      <div className="card">
        {loading
          ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
          : filtered.length === 0
            ? <div className="empty-state"><div className="icon">🚩</div><p>No reports{filter !== 'all' ? ` (${filter})` : ''} yet</p></div>
            : filtered.map(r => (
              <div
                key={r.id}
                style={{
                  ...s.reportCard,
                  borderLeftColor: r.status === 'resolved' ? 'var(--green)' : 'var(--amber)',
                  opacity: r.status === 'resolved' ? 0.7 : 1,
                }}
              >
                <div style={s.reportTop}>
                  <span className={`badge ${r.status === 'resolved' ? 'badge-green' : 'badge-gold'}`}>
                    {r.status === 'resolved' ? '✓ Resolved' : '● Open'}
                  </span>
                  <span style={s.reportTime}>{timeAgo(r.createdAt)}</span>
                </div>
                <p style={s.reportMsg}>{r.message}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {r.status === 'resolved'
                    ? <button className="btn btn-ghost btn-sm" onClick={() => handleReopen(r.id)}>↩️ Reopen</button>
                    : <button className="btn btn-gold btn-sm" onClick={() => handleResolve(r.id)}>✓ Mark Resolved</button>
                  }
                  <button className="btn btn-red btn-sm" onClick={() => handleDelete(r.id)}>🗑️ Delete</button>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}

const s = {
  title:      { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 },
  sub:        { fontSize: 13, color: 'var(--muted)', marginBottom: 24 },
  statChip:   { background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.22)', borderRadius: 10, padding: '10px 18px', textAlign: 'center', minWidth: 90 },
  statNum:    { display: 'block', fontSize: 22, fontWeight: 800 },
  statLbl:    { display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2 },
  reportCard: { borderLeft: '3px solid', borderRadius: 10, background: 'var(--card2)', padding: '14px 16px', marginBottom: 10 },
  reportTop:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reportTime: { fontSize: 11, color: 'var(--dim)' },
  reportMsg:  { color: 'var(--text)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
}
