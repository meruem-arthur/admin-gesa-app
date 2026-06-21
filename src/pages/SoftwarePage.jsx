import React, { useEffect, useState, useMemo } from 'react'
import { getSoftware, addSoftware, deleteSoftware } from '../hooks/useFirestore'
import { uploadPhoto } from '../cloudinary'
import { useToast } from '../hooks/useToast'

const EMPTY = { name: '', category: '', downloadUrl: '', description: '', fileSize: '' }

export default function SoftwarePage() {
  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(EMPTY)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [progress, setProgress]   = useState('')
  const [catInput, setCatInput]   = useState('')
  const [showSug, setShowSug]     = useState(false)
  const { show, Toast }           = useToast()

  const load = async () => { setLoading(true); setList(await getSoftware()); setLoading(false) }
  useEffect(() => { load() }, [])

  // Derive existing categories for autocomplete
  const existingCats = useMemo(() =>
    [...new Set(list.map(s => s.category).filter(Boolean))].sort()
  , [list])

  const catSuggestions = catInput
    ? existingCats.filter(c => c.toLowerCase().includes(catInput.toLowerCase()))
    : existingCats

  function handleImagePick(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.category || !form.downloadUrl)
      return show('Fill name, category and download URL', 'error')
    setSaving(true)
    try {
      let imageUrl = ''
      if (imageFile) {
        setProgress('Uploading image…')
        imageUrl = await uploadPhoto(imageFile, 'gesa/software')
      }
      setProgress('Saving…')
      await addSoftware({ ...form, imageUrl })
      await load()
      setForm(EMPTY); setCatInput(''); setImageFile(null); setImagePreview(null)
      setProgress('')
      show('Software added!')
    } catch (err) { show(err.message, 'error'); setProgress('') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return
    await deleteSoftware(id); await load(); show('Deleted.')
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Software & Tools</h1>
      <p style={s.note}>💡 These are desktop programs. Students will copy the link and open it on their PC.</p>

      {/* Add form */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Add Software</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Software Name *</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. ArcGIS Pro 3.2" />
            </div>
            <div className="form-group" style={{position:'relative'}}>
              <label>Category *</label>
              <input
                value={catInput || form.category}
                onChange={e => { setCatInput(e.target.value); setForm(f=>({...f,category:e.target.value})); setShowSug(true) }}
                onFocus={() => setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder="e.g. GIS, CAD, Surveying…"
              />
              {showSug && catSuggestions.length > 0 && (
                <div style={s.suggestions}>
                  {catSuggestions.map(c => (
                    <div key={c} style={s.suggestion} onMouseDown={() => {
                      setForm(f=>({...f,category:c})); setCatInput(c); setShowSug(false)
                    }}>{c}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Download URL *</label>
            <input value={form.downloadUrl} onChange={e=>setForm(f=>({...f,downloadUrl:e.target.value}))} placeholder="https://…" />
            <small style={{color:'var(--dim)',fontSize:11}}>Direct download or product page link</small>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>File Size <span style={{color:'var(--muted)',fontWeight:400}}>(optional)</span></label>
              <input value={form.fileSize} onChange={e=>setForm(f=>({...f,fileSize:e.target.value}))} placeholder="e.g. 4.2 GB" />
            </div>
            <div className="form-group">
              <label>Software Image <span style={{color:'var(--muted)',fontWeight:400}}>(optional)</span></label>
              <input type="file" accept="image/*" onChange={handleImagePick} style={{padding:'8px 12px'}} />
            </div>
          </div>
          {imagePreview && (
            <div style={{marginBottom:12,position:'relative',display:'inline-block'}}>
              <img src={imagePreview} alt="Preview" style={{width:120,height:80,objectFit:'cover',borderRadius:8,border:'1px solid var(--border)'}} />
              <button type="button" onClick={()=>{setImageFile(null);setImagePreview(null)}}
                style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',borderRadius:'50%',width:20,height:20,cursor:'pointer',fontSize:12,lineHeight:'20px',textAlign:'center'}}>✕</button>
            </div>
          )}
          <div className="form-group">
            <label>Description <span style={{color:'var(--muted)',fontWeight:400}}>(optional)</span></label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Brief description of what the software does…" rows={2} />
          </div>
          {progress && <p style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>⏳ {progress}</p>}
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner"/> : '💾 Add Software'}
          </button>
        </form>
      </div>

      {/* List grouped by category */}
      {loading
        ? <div className="card"><div style={{textAlign:'center',padding:32}}><span className="spinner"/></div></div>
        : list.length === 0
          ? <div className="card"><div className="empty-state"><div className="icon">💾</div><p>No software added yet</p></div></div>
          : (
            <div className="card">
              <h2 style={s.formTitle}>All Software ({list.length})</h2>
              <table>
                <thead>
                  <tr><th>Image</th><th>Name</th><th>Category</th><th>Size</th><th>Link</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {list.map(sw => (
                    <tr key={sw.id}>
                      <td>
                        {sw.imageUrl
                          ? <img src={sw.imageUrl} alt="" style={{width:48,height:36,objectFit:'cover',borderRadius:4,border:'1px solid var(--border)'}} />
                          : <span style={{color:'var(--dim)',fontSize:18}}>💾</span>}
                      </td>
                      <td style={{fontWeight:600}}>{sw.name}</td>
                      <td><span className="badge badge-purple">{sw.category}</span></td>
                      <td style={{color:'var(--muted)',fontSize:12}}>{sw.fileSize || '—'}</td>
                      <td>
                        <a href={sw.downloadUrl} target="_blank" rel="noreferrer" style={{color:'var(--blue)',fontSize:12}}>
                          🔗 Link
                        </a>
                      </td>
                      <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(sw.id,sw.name)}>🗑️ Delete</button></td>
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
  title:       { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 },
  note:        { fontSize: 13, color: 'var(--muted)', marginBottom: 24, padding: '10px 14px', background: 'rgba(212,160,23,0.07)', borderRadius: 8, borderLeft: '3px solid rgba(212,160,23,0.4)' },
  formTitle:   { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  suggestions: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1535', border: '1px solid var(--border)', borderRadius: 8, zIndex: 50, maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' },
  suggestion:  { padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
}
