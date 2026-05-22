import React, { useEffect, useState } from 'react'
import { getAnnouncements, addAnnouncement, deleteAnnouncement } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

const TAGS   = ['Academic', 'Finance', 'Trip', 'Resources', 'Event', 'General']
const COLORS = ['purple', 'gold', 'amber', 'blue', 'green']
const EMPTY  = { title: '', body: '', tag: 'General', color: 'purple', author: '' }

function timeAgo(val) {
  if (!val) return ''
  const d = val.toDate ? val.toDate() : new Date(val)
  const mins = Math.floor((Date.now() - d) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const COLOR_MAP = {
  purple: '#a855f7', gold: '#e8b82a', amber: '#f59e0b', blue: '#60a5fa', green: '#4ade80',
}

export default function AnnouncementsPage() {
  const [list, setList]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const { show, Toast }     = useToast()

  const load = async () => { setLoading(true); setList(await getAnnouncements()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.body) return show('Fill title and body', 'error')
    setSaving(true)
    try {
      await addAnnouncement(form); await load(); setForm(EMPTY)
      show('Announcement posted!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, title) {
    if (!confirm(`Delete "${title}"?`)) return
    await deleteAnnouncement(id); await load(); show('Deleted.')
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Announcements</h1>

      {/* Form */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Post Announcement</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Title *</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Exams timetable released" />
            </div>
            <div className="form-group">
              <label>Author</label>
              <input value={form.author} onChange={e=>setForm(f=>({...f,author:e.target.value}))} placeholder="e.g. GESA President" />
            </div>
          </div>
          <div className="form-group">
            <label>Body *</label>
            <textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder="Full announcement text…" style={{minHeight:100}} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tag</label>
              <div className="chip-group" style={{marginTop:6}}>
                {TAGS.map(t=>(
                  <span key={t} className={`chip${form.tag===t?' active':''}`} onClick={()=>setForm(f=>({...f,tag:t}))}>{t}</span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Color</label>
              <div className="chip-group" style={{marginTop:6}}>
                {COLORS.map(c=>(
                  <span
                    key={c}
                    className={`chip${form.color===c?' active':''}`}
                    onClick={()=>setForm(f=>({...f,color:c}))}
                    style={form.color===c ? {background:COLOR_MAP[c]+'33',borderColor:COLOR_MAP[c],color:COLOR_MAP[c]} : {}}
                  >{c}</span>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner"/> : '📢 Post Announcement'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="card">
        <h2 style={s.formTitle}>All Announcements ({list.length})</h2>
        {loading ? <div style={{textAlign:'center',padding:32}}><span className="spinner"/></div>
          : list.length===0 ? <div className="empty-state"><div className="icon">📭</div><p>No announcements yet</p></div>
          : list.map(ann => (
            <div key={ann.id} style={{...s.annCard, borderLeftColor: COLOR_MAP[ann.color] || COLOR_MAP.purple}}>
              <div style={s.annTop}>
                <div>
                  <span style={{...s.annTitle, color: COLOR_MAP[ann.color] || COLOR_MAP.purple}}>{ann.title}</span>
                  <span style={s.annMeta}> · {ann.author || 'GESA'} · {timeAgo(ann.createdAt)}</span>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span className="badge badge-purple">{ann.tag}</span>
                  <button className="btn btn-red btn-sm" onClick={()=>handleDelete(ann.id,ann.title)}>🗑️</button>
                </div>
              </div>
              <p style={s.annBody}>{ann.body}</p>
            </div>
          ))}
      </div>
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  annCard:   { borderLeft: '3px solid', borderRadius: 10, background: 'var(--card2)', padding: '14px 16px', marginBottom: 10 },
  annTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 12 },
  annTitle:  { fontWeight: 700, fontSize: 14 },
  annMeta:   { color: 'var(--dim)', fontSize: 12 },
  annBody:   { color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 },
}
