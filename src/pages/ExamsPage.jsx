import React, { useEffect, useState } from 'react'
import { getExams, addExam, deleteExam } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

const LEVELS = ['100', '200', '300', '400', 'All']
const EMPTY  = { courseCode: '', courseName: '', date: '', venue: '', level: 'All' }

function fmtDate(val) {
  if (!val) return ''
  const d = val.toDate ? val.toDate() : new Date(val)
  return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function daysLeft(val) {
  if (!val) return null
  const d = val.toDate ? val.toDate() : new Date(val)
  return Math.ceil((d - new Date()) / 86400000)
}

export default function ExamsPage() {
  const [list, setList]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const { show, Toast }     = useToast()

  const load = async () => { setLoading(true); setList(await getExams()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.courseCode || !form.date) return show('Fill course code and date', 'error')
    setSaving(true)
    try {
      await addExam(form); await load(); setForm(EMPTY)
      show('Exam added!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, code) {
    if (!confirm(`Delete ${code} exam?`)) return
    await deleteExam(id); await load(); show('Deleted.')
  }

  const now      = new Date()
  const upcoming = list.filter(e => (e.date?.toDate ? e.date.toDate() : new Date(e.date)) >= now)
  const past     = list.filter(e => (e.date?.toDate ? e.date.toDate() : new Date(e.date)) < now)

  function urgencyColor(days) {
    if (days === null) return 'var(--dim)'
    if (days < 0)  return 'var(--dim)'
    if (days === 0) return 'var(--red)'
    if (days <= 3)  return '#f87171'
    if (days <= 7)  return 'var(--amber)'
    return 'var(--green)'
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Exam Countdown</h1>
      <p style={s.sub}>Exam dates added here appear as live countdowns in the student app.</p>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Add Exam</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Course Code *</label>
              <input value={form.courseCode} onChange={e=>setForm(f=>({...f,courseCode:e.target.value.toUpperCase()}))} placeholder="e.g. GE 305" />
            </div>
            <div className="form-group">
              <label>Course Name</label>
              <input value={form.courseName} onChange={e=>setForm(f=>({...f,courseName:e.target.value}))} placeholder="e.g. Remote Sensing" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date & Time * (YYYY-MM-DDTHH:MM:SSZ)</label>
              <input value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} placeholder="e.g. 2025-06-10T09:00:00Z" />
            </div>
            <div className="form-group">
              <label>Venue</label>
              <input value={form.venue} onChange={e=>setForm(f=>({...f,venue:e.target.value}))} placeholder="e.g. Exam Hall A" />
            </div>
          </div>
          <div className="form-group">
            <label>Level</label>
            <div className="chip-group" style={{marginTop:6}}>
              {LEVELS.map(l=>(
                <span key={l} className={`chip${form.level===l?' active':''}`} onClick={()=>setForm(f=>({...f,level:l}))}>
                  {l === 'All' ? 'All Levels' : `Level ${l}`}
                </span>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner"/> : '⏰ Add Exam'}
          </button>
        </form>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <h2 style={s.formTitle}>Upcoming Exams ({upcoming.length})</h2>
        {loading ? <div style={{textAlign:'center',padding:32}}><span className="spinner"/></div>
          : upcoming.length===0 ? <div className="empty-state"><div className="icon">⏰</div><p>No upcoming exams</p></div>
          : (
            <table>
              <thead><tr><th>Code</th><th>Course</th><th>Date</th><th>Venue</th><th>Level</th><th>Countdown</th><th>Actions</th></tr></thead>
              <tbody>
                {upcoming.map(ex=>{
                  const days = daysLeft(ex.date)
                  const col  = urgencyColor(days)
                  return (
                    <tr key={ex.id}>
                      <td style={{fontWeight:700,color:'var(--gold3)'}}>{ex.courseCode}</td>
                      <td style={{color:'var(--muted)',fontSize:12}}>{ex.courseName}</td>
                      <td style={{color:'var(--gold2)',fontSize:12}}>{fmtDate(ex.date)}</td>
                      <td style={{color:'var(--muted)',fontSize:12}}>{ex.venue || '—'}</td>
                      <td><span className="badge badge-purple">{ex.level || 'All'}</span></td>
                      <td style={{color:col,fontWeight:700}}>
                        {days === 0 ? 'TODAY!' : days === 1 ? '1 day' : `${days} days`}
                      </td>
                      <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(ex.id,ex.courseCode)}>🗑️</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      {past.length > 0 && (
        <div className="card" style={{opacity:0.55}}>
          <h2 style={s.formTitle}>Past Exams ({past.length})</h2>
          <table>
            <thead><tr><th>Code</th><th>Course</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {past.map(ex=>(
                <tr key={ex.id}>
                  <td style={{color:'var(--dim)'}}>{ex.courseCode}</td>
                  <td style={{color:'var(--dim)',fontSize:12}}>{ex.courseName}</td>
                  <td style={{color:'var(--dim)',fontSize:12}}>{fmtDate(ex.date)}</td>
                  <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(ex.id,ex.courseCode)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 },
  sub:       { fontSize: 13, color: 'var(--muted)', marginBottom: 24 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
}
