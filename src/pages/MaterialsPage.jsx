import React, { useEffect, useState } from 'react'
import { getMaterials, addMaterial, deleteMaterial } from '../hooks/useFirestore'
import { uploadFile } from '../cloudinary'
import { useToast } from '../hooks/useToast'

const LEVELS = ['100', '200', '300', '400']
const SEMS   = ['1', '2']
const EMPTY  = { level: '100', semester: '1', courseCode: '', courseName: '' }

export default function MaterialsPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState(EMPTY)
  const [file, setFile]         = useState(null)
  const [saving, setSaving]     = useState(false)
  const [progress, setProgress] = useState('')
  const { show, Toast }         = useToast()

  const load = async () => { setLoading(true); setList(await getMaterials()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.courseCode || !file) return show('Fill course code and pick a PDF', 'error')
    setSaving(true)
    setProgress('Uploading to Cloudinary…')
    try {
      const folder  = `gesa/materials/level${form.level}/sem${form.semester}`
      const fileUrl = await uploadFile(file, folder)
      setProgress('Saving to database…')
      await addMaterial({ ...form, fileUrl })
      await load(); setForm(EMPTY); setFile(null)
      setProgress('')
      show('Material uploaded!')
    } catch (err) { show(err.message, 'error'); setProgress('') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, code) {
    if (!confirm(`Delete ${code}?`)) return
    await deleteMaterial(id); await load(); show('Deleted.')
  }

  // Group by level
  const grouped = LEVELS.reduce((acc, lvl) => {
    acc[lvl] = list.filter(m => String(m.level) === lvl)
    return acc
  }, {})

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Learning Materials</h1>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Upload Material</h2>
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
          <div className="form-group">
            <label>PDF File *</label>
            <input
              type="file" accept="application/pdf"
              onChange={e=>setFile(e.target.files[0])}
              style={{padding:'8px 12px'}}
            />
            {file && <p style={{fontSize:12,color:'var(--gold2)',marginTop:4}}>📄 {file.name} ({(file.size/1024/1024).toFixed(2)} MB)</p>}
          </div>
          {progress && <p style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>⏳ {progress}</p>}
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner"/> : '📤 Upload Material'}
          </button>
        </form>
      </div>

      {/* Grouped by level */}
      {LEVELS.map(lvl => (
        grouped[lvl].length > 0 && (
          <div key={lvl} className="card" style={{marginBottom:16}}>
            <h2 style={s.formTitle}>Level {lvl} ({grouped[lvl].length} materials)</h2>
            <table>
              <thead><tr><th>Code</th><th>Course Name</th><th>Sem</th><th>File</th><th>Actions</th></tr></thead>
              <tbody>
                {grouped[lvl].map(m=>(
                  <tr key={m.id}>
                    <td style={{fontWeight:700,color:'var(--gold3)'}}>{m.courseCode}</td>
                    <td>{m.courseName}</td>
                    <td><span className="badge badge-purple">Sem {m.semester}</span></td>
                    <td>
                      <a href={m.fileUrl} target="_blank" rel="noreferrer" style={{color:'var(--blue)',fontSize:12}}>
                        📄 View PDF
                      </a>
                    </td>
                    <td>
                      <button className="btn btn-red btn-sm" onClick={()=>handleDelete(m.id,m.courseCode)}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ))}

      {!loading && list.length === 0 && (
        <div className="card">
          <div className="empty-state"><div className="icon">📚</div><p>No materials uploaded yet</p></div>
        </div>
      )}
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
}
