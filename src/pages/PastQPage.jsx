import React, { useEffect, useState } from 'react'
import { getPastQuestions, addPastQuestion, deletePastQuestion } from '../hooks/useFirestore'
import { uploadFile } from '../cloudinary'
import { useToast } from '../hooks/useToast'

const LEVELS = ['100', '200', '300', '400']
const SEMS   = ['1', '2']
const EMPTY  = { level: '100', semester: '1', courseCode: '', courseName: '', year: new Date().getFullYear().toString() }

export default function PastQPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState(EMPTY)
  const [file, setFile]         = useState(null)
  const [saving, setSaving]     = useState(false)
  const [progress, setProgress] = useState('')
  const { show, Toast }         = useToast()

  const load = async () => { setLoading(true); setList(await getPastQuestions()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.courseCode || !form.year || !file) return show('Fill all fields and pick a file', 'error')
    setSaving(true)
    setProgress('Uploading to Cloudinary…')
    try {
      const folder    = `gesa/pastq/level${form.level}/sem${form.semester}`
      const fileUrl   = await uploadFile(file, folder)
      const fileName  = file.name
      setProgress('Saving to database…')
      await addPastQuestion({ ...form, fileUrl, fileName })
      await load(); setForm(EMPTY); setFile(null)
      setProgress('')
      show('Past question uploaded!')
    } catch (err) { show(err.message, 'error'); setProgress('') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, code, year) {
    if (!confirm(`Delete ${code} ${year}?`)) return
    await deletePastQuestion(id); await load(); show('Deleted.')
  }

  // Group by level then year
  const grouped = LEVELS.reduce((acc, lvl) => {
    acc[lvl] = list.filter(m => String(m.level) === lvl)
    return acc
  }, {})

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Past Questions</h1>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Upload Past Question</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Level *</label>
              <div className="chip-group" style={{marginTop:6}}>
                {LEVELS.map(l=>(
                  <span key={l} className={`chip${form.level===l?' active':''}`} onClick={()=>setForm(f=>({...f,level:l}))}>Level {l}</span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Semester *</label>
              <div className="chip-group" style={{marginTop:6}}>
                {SEMS.map(s=>(
                  <span key={s} className={`chip${form.semester===s?' active':''}`} onClick={()=>setForm(f=>({...f,semester:s}))}>Sem {s}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label>Course Code *</label>
              <input value={form.courseCode} onChange={e=>setForm(f=>({...f,courseCode:e.target.value.toUpperCase()}))} placeholder="e.g. GE 305" />
            </div>
            <div className="form-group">
              <label>Course Name</label>
              <input value={form.courseName} onChange={e=>setForm(f=>({...f,courseName:e.target.value}))} placeholder="e.g. Surveying II" />
            </div>
            <div className="form-group">
              <label>Year *</label>
              <input value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))} placeholder="e.g. 2024" maxLength={4} />
            </div>
          </div>
          <div className="form-group">
            <label>File * <span style={{color:'var(--muted)',fontWeight:400}}>(PDF, Word, PowerPoint)</span></label>
            <input type="file" accept=".pdf,.docx,.pptx,.doc,.ppt" onChange={e=>setFile(e.target.files[0])} style={{padding:'8px 12px'}} />
            {file && <p style={{fontSize:12,color:'var(--gold2)',marginTop:4}}>📄 {file.name} ({(file.size/1024/1024).toFixed(2)} MB)</p>}
          </div>
          {progress && <p style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>⏳ {progress}</p>}
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner"/> : '📤 Upload Past Question'}
          </button>
        </form>
      </div>

      {LEVELS.map(lvl => (
        grouped[lvl].length > 0 && (
          <div key={lvl} className="card" style={{marginBottom:16}}>
            <h2 style={s.formTitle}>Level {lvl} ({grouped[lvl].length} questions)</h2>
            <table>
              <thead><tr><th>Code</th><th>Course</th><th>Year</th><th>Sem</th><th>File</th><th>Actions</th></tr></thead>
              <tbody>
                {grouped[lvl].sort((a,b)=>b.year-a.year).map(p=>(
                  <tr key={p.id}>
                    <td style={{fontWeight:700,color:'var(--gold3)'}}>{p.courseCode}</td>
                    <td style={{color:'var(--muted)',fontSize:12}}>{p.courseName}</td>
                    <td><span className="badge badge-gold">{p.year}</span></td>
                    <td><span className="badge badge-purple">Sem {p.semester}</span></td>
                    <td><a href={p.fileUrl} target="_blank" rel="noreferrer" style={{color:'var(--blue)',fontSize:12}}>📄 View</a></td>
                    <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(p.id,p.courseCode,p.year)}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ))}

      {!loading && list.length === 0 && (
        <div className="card">
          <div className="empty-state"><div className="icon">📄</div><p>No past questions uploaded yet</p></div>
        </div>
      )}
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
}
