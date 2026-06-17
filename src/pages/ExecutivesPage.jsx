import React, { useEffect, useState } from 'react'
import { getExecutives, addExecutive, updateExecutive, deleteExecutive } from '../hooks/useFirestore'
import { uploadPhoto } from '../cloudinary'
import { useToast } from '../hooks/useToast'

const EMPTY = { name: '', position: '', order: '', phone: '', bio: '', photoUrl: '' }

export default function ExecutivesPage() {
  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving]       = useState(false)
  const { show, Toast }           = useToast()

  const load = async () => { setLoading(true); setList(await getExecutives()); setLoading(false) }
  useEffect(() => { load() }, [])

  function startEdit(ex) {
    setEditId(ex.id)
    setForm({
      name: ex.name,
      position: ex.position,
      order: String(ex.order || ''),
      phone: ex.phone || '',
      bio: ex.bio || '',
      photoUrl: ex.photoUrl || '',
    })
    setPhotoFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() { setEditId(null); setForm(EMPTY); setPhotoFile(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.position) return show('Fill name and position', 'error')
    setSaving(true)
    try {
      let photoUrl = form.photoUrl
      if (photoFile) photoUrl = await uploadPhoto(photoFile, 'gesa/photos/executives')
      const data = { ...form, order: Number(form.order) || 99, photoUrl }
      editId ? await updateExecutive(editId, data) : await addExecutive(data)
      await load(); reset()
      show(editId ? 'Executive updated!' : 'Executive added!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete ${name}?`)) return
    await deleteExecutive(id); await load()
    show('Deleted.')
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Executives</h1>

      {/* Form */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>{editId ? '✏️ Edit Executive' : '➕ Add Executive'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kwame Asante" /></div>
            <div className="form-group"><label>Position *</label><input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="e.g. President" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Order (1 = President)</label><input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} placeholder="1" /></div>
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+233 24 000 0001" /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Photo</label>
              <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} style={{ padding: '8px 12px' }} />
              {form.photoUrl && !photoFile && <img src={form.photoUrl} alt="" style={s.photoThumb} />}
            </div>
            <div className="form-group"><label>Bio (optional)</label><textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio…" style={{ minHeight: 40 }} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? <span className="spinner" /> : editId ? 'Update' : 'Save Executive'}</button>
            {editId && <button type="button" className="btn btn-ghost" onClick={reset}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        <h2 style={s.formTitle}>All Executives ({list.length})</h2>
        {loading ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
          : list.length === 0 ? <div className="empty-state"><div className="icon">👥</div><p>No executives yet</p></div>
          : (
            <table>
              <thead><tr><th>#</th><th>Photo</th><th>Name</th><th>Position</th><th>Phone</th><th>Actions</th></tr></thead>
              <tbody>
                {list.map((ex, i) => (
                  <tr key={ex.id}>
                    <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                    <td>
                      <div className="avatar">
                        {ex.photoUrl ? <img src={ex.photoUrl} alt={ex.name} /> : ex.name.slice(0, 2).toUpperCase()}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{ex.name}</td>
                    <td><span className="badge badge-gold">{ex.position}</span></td>
                    <td style={{ color: 'var(--gold2)', fontSize: 12 }}>{ex.phone || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(ex)}>✏️ Edit</button>
                        <button className="btn btn-red btn-sm" onClick={() => handleDelete(ex.id, ex.name)}>🗑️ Delete</button>
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
  photoThumb:{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover', marginTop: 6, border: '2px solid rgba(212,160,23,0.3)' },
}
