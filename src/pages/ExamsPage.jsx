import React, { useEffect, useState } from 'react'
import { getExams, addExam, deleteExam } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

const EMPTY  = { title: '', startDate: '', endDate: '', note: '' }

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
    if (!form.title || !form.startDate) return show('Fill title and start date', 'error')
    setSaving(true)
    try {
      await addExam(form); await load(); setForm(EMPTY)
      show('Exam added!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, title) {
    if (!confirm(`Delete "${title}" exam?`)) return
    await deleteExam(id); await load(); show('Deleted.')
  }

  const now      = new Date()
  const upcoming = list.filter(e => (e.startDate?.toDate ? e.startDate.toDate() : new Date(e.startDate)) >= now)
  const past     = list.filter(e => (e.startDate?.toDate ? e.startDate.toDate() : new Date(e.startDate)) < now)

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
          <div className="form-group">
            <label>Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Fundamentals of Nursing Mid-Semester Exam" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date & Time * (YYYY-MM-DDTHH:MM)</label>
              <input type="datetime-local" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} />
            </div>
            <div className="form-group">
              <label>End Date & Time (optional)</label>
              <input type="datetime-local" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} />
            </div>
          </div>
          <div className="form-group">
            <label>Note (optional)</label>
            <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="e.g. Bring your student ID" />
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
              <thead><tr><th>Title</th><th>Start Date</th><th>End Date</th><th>Countdown</th><th>Actions</th></tr></thead>
              <tbody>
                {upcoming.map(ex=>{
                  const days = daysLeft(ex.startDate)
                  const col  = urgencyColor(days)
                  return (
                    <tr key={ex.id}>
                      <td style={{fontWeight:700,color:'var(--gold3)'}}>{ex.title}</td>
                      <td style={{color:'var(--gold2)',fontSize:12}}>{fmtDate(ex.startDate)}</td>
                      <td style={{color:'var(--muted)',fontSize:12}}>{ex.endDate ? fmtDate(ex.endDate) : '—'}</td>
                      <td style={{color:col,fontWeight:700}}>
                        {days === 0 ? 'TODAY!' : days === 1 ? '1 day' : `${days} days`}
                      </td>
                      <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(ex.id,ex.title)}>🗑️</button></td>
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
            <thead><tr><th>Title</th><th>Start Date</th><th>Actions</th></tr></thead>
            <tbody>
              {past.map(ex=>(
                <tr key={ex.id}>
                  <td style={{color:'var(--dim)'}}>{ex.title}</td>
                  <td style={{color:'var(--dim)',fontSize:12}}>{fmtDate(ex.startDate)}</td>
                  <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(ex.id,ex.title)}>🗑️</button></td>
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
