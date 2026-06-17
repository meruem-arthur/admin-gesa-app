import React, { useEffect, useState } from 'react'
import { getLecturers, addLecturer, updateLecturer, deleteLecturer } from '../hooks/useFirestore'
import { uploadPhoto } from '../cloudinary'
import { useToast } from '../hooks/useToast'

// pinnedRole: '' | 'HOD' | 'Dean'
const EMPTY = { name: '', title: '', major: '', phone: '', email: '', pinnedRole: '', photoUrl: '' }

const PIN_OPTIONS = [
  { value: '',     label: 'None' },
  { value: 'HOD',  label: 'HOD'  },
  { value: 'Dean', label: 'Dean' },
]

export default function LecturersPage() {
  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving]       = useState(false)
  const { show, Toast }           = useToast()

  const load = async () => {
    setLoading(true)
    const d = await getLecturers()
    d.sort((a, b) => {
      const aPinned = !!a.pinnedRole
      const bPinned = !!b.pinnedRole
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return a.name.localeCompare(b.name)
    })
    setList(d)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startEdit(lec) {
    setEditId(lec.id)
    setForm({
      name: lec.name,
      title: lec.title || '',
      major: lec.major || '',
      phone: lec.phone || '',
      email: lec.email || '',
      pinnedRole: lec.pinnedRole || '',
      photoUrl: lec.photoUrl || '',
    })
    setPhotoFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() { setEditId(null); setForm(EMPTY); setPhotoFile(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.title) return show('Fill name and title', 'error')
    setSaving(true)
    try {
      let photoUrl = form.photoUrl
      if (photoFile) photoUrl = await uploadPhoto(photoFile, 'gesa/photos/lecturers')
      const data = { ...form, photoUrl }
      editId ? await updateLecturer(editId, data) : await addLecturer(data)
      await load(); reset()
      show(editId ? 'Lecturer updated!' : 'Lecturer added!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete ${name}?`)) return
    await deleteLecturer(id); await load(); show('Deleted.')
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Lecturers</h1>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>{editId ? '✏️ Edit Lecturer' : '➕ Add Lecturer'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Dr. Kwame Asante" /></div>
            <div className="form-group"><label>Title *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Dr., Prof., Mr." /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Major / Specialisation</label><input value={form.major} onChange={e=>setForm(f=>({...f,major:e.target.value}))} placeholder="e.g. Remote Sensing & GIS" /></div>
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+233 24 000 0001" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="name@umat.edu.gh" /></div>
            <div className="form-group">
              <label>Photo</label>
              <input type="file" accept="image/*" onChange={e=>setPhotoFile(e.target.files[0])} style={{ padding: '8px 12px' }} />
              {form.photoUrl && !photoFile && <img src={form.photoUrl} alt="" style={s.thumb} />}
            </div>
          </div>

          {/* Pin role — None / HOD / Dean (mutually exclusive) */}
          <div className="form-group">
            <label>Pin as (shows at top of list)</label>
            <div className="chip-group" style={{ marginTop: 6 }}>
              {PIN_OPTIONS.map(opt => (
                <span
                  key={opt.value}
                  className={`chip${form.pinnedRole === opt.value ? ' active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, pinnedRole: opt.value }))}
                >
                  {opt.label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? <span className="spinner"/> : editId ? 'Update' : 'Save Lecturer'}</button>
            {editId && <button type="button" className="btn btn-ghost" onClick={reset}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={s.formTitle}>All Lecturers ({list.length})</h2>
        {loading ? <div style={{textAlign:'center',padding:32}}><span className="spinner"/></div>
          : list.length===0 ? <div className="empty-state"><div className="icon">🎓</div><p>No lecturers yet</p></div>
          : (
            <table>
              <thead><tr><th>Photo</th><th>Name</th><th>Title</th><th>Major</th><th>Phone</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {list.map(lec => (
                  <tr key={lec.id}>
                    <td><div className="avatar">{lec.photoUrl ? <img src={lec.photoUrl} alt={lec.name}/> : lec.name.slice(0,2).toUpperCase()}</div></td>
                    <td style={{fontWeight:600}}>{lec.name}</td>
                    <td style={{color:'var(--muted)'}}>{lec.title}</td>
                    <td style={{color:'var(--muted)', fontSize:12}}>{lec.major}</td>
                    <td style={{color:'var(--gold2)', fontSize:12}}>{lec.phone}</td>
                    <td>
                      {lec.pinnedRole === 'HOD'  ? <span className="badge badge-gold">HOD</span>
                        : lec.pinnedRole === 'Dean' ? <span className="badge badge-gold">Dean</span>
                        : <span className="badge badge-purple">Lecturer</span>
                      }
                    </td>
                    <td>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>startEdit(lec)}>✏️ Edit</button>
                        <button className="btn btn-red btn-sm" onClick={()=>handleDelete(lec.id,lec.name)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  thumb:     { width: 48, height: 48, borderRadius: 24, objectFit: 'cover', marginTop: 6, border: '2px solid rgba(212,160,23,0.3)' },
}
