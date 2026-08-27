import React, { useEffect, useState } from 'react'
import { getTutorials, addTutorial, deleteTutorial } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

const EMPTY = { title: '', software: '', youtubeUrl: '', thumbnailUrl: '', description: '' }

export default function TutorialsPage() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const { show, Toast }       = useToast()

  const load = async () => { setLoading(true); setList(await getTutorials()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.youtubeUrl)
      return show('Fill title and YouTube link', 'error')
    setSaving(true)
    try {
      await addTutorial(form)
      await load()
      setForm(EMPTY)
      show('Tutorial added!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, title) {
    if (!confirm(`Delete "${title}"?`)) return
    await deleteTutorial(id); await load(); show('Deleted.')
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Tutorials</h1>
      <p style={s.note}>💡 Video guides for how to use the software listed under Software & Tools.</p>

      {/* Add form */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Add Tutorial</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Title *</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Getting started with ArcGIS Pro" />
            </div>
            <div className="form-group">
              <label>Software <span style={{color:'var(--muted)',fontWeight:400}}>(optional)</span></label>
              <input value={form.software} onChange={e=>setForm(f=>({...f,software:e.target.value}))} placeholder="e.g. ArcGIS Pro" />
            </div>
          </div>
          <div className="form-group">
            <label>YouTube Link *</label>
            <input value={form.youtubeUrl} onChange={e=>setForm(f=>({...f,youtubeUrl:e.target.value}))} placeholder="https://youtube.com/…" />
          </div>
          <div className="form-group">
            <label>Thumbnail URL <span style={{color:'var(--muted)',fontWeight:400}}>(optional)</span></label>
            <input value={form.thumbnailUrl} onChange={e=>setForm(f=>({...f,thumbnailUrl:e.target.value}))} placeholder="https://…" />
          </div>
          <div className="form-group">
            <label>Description <span style={{color:'var(--muted)',fontWeight:400}}>(optional)</span></label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Brief description of what this tutorial covers…" rows={2} />
          </div>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner"/> : '💾 Add Tutorial'}
          </button>
        </form>
      </div>

      {/* List */}
      {loading
        ? <div className="card"><div style={{textAlign:'center',padding:32}}><span className="spinner"/></div></div>
        : list.length === 0
          ? <div className="card"><div className="empty-state"><div className="icon">▶️</div><p>No tutorials added yet</p></div></div>
          : (
            <div className="card">
              <h2 style={s.formTitle}>All Tutorials ({list.length})</h2>
              <table>
                <thead>
                  <tr><th>Thumbnail</th><th>Title</th><th>Software</th><th>Link</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {list.map(t => (
                    <tr key={t.id}>
                      <td>
                        {t.thumbnailUrl
                          ? <img src={t.thumbnailUrl} alt="" style={{width:64,height:36,objectFit:'cover',borderRadius:4,border:'1px solid var(--border)'}} />
                          : <span style={{color:'var(--dim)',fontSize:18}}>▶️</span>}
                      </td>
                      <td style={{fontWeight:600}}>{t.title}</td>
                      <td>{t.software ? <span className="badge badge-purple">{t.software}</span> : <span style={{color:'var(--dim)',fontSize:12}}>—</span>}</td>
                      <td>
                        <a href={t.youtubeUrl} target="_blank" rel="noreferrer" style={{color:'var(--blue)',fontSize:12}}>
                          ▶ Watch
                        </a>
                      </td>
                      <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(t.id,t.title)}>🗑️ Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 },
  note:      { fontSize: 13, color: 'var(--muted)', marginBottom: 24, padding: '10px 14px', background: 'rgba(212,160,23,0.07)', borderRadius: 8, borderLeft: '3px solid rgba(212,160,23,0.4)' },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
}
