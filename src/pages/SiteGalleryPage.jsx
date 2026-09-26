import React, { useEffect, useState } from 'react'
import { getGalleryPhotos, addGalleryPhoto, deleteGalleryPhoto } from '../hooks/useFirestore'
import { uploadPhoto } from '../cloudinary'
import { useToast } from '../hooks/useToast'

export default function SiteGalleryPage() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [caption, setCaption] = useState('')
  const [file, setFile]       = useState(null)
  const [saving, setSaving]   = useState(false)
  const { show, Toast }       = useToast()

  const load = async () => { setLoading(true); setList(await getGalleryPhotos()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return show('Choose an image', 'error')
    setSaving(true)
    try {
      const imageUrl = await uploadPhoto(file, 'gesa/site/gallery')
      await addGalleryPhoto({ imageUrl, caption })
      await load(); setFile(null); setCaption('')
      show('Photo added!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this photo?')) return
    await deleteGalleryPhoto(id); await load(); show('Deleted.')
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Site Gallery</h1>
      <p style={s.hint}>Photos shown on the public website's Gallery page.</p>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Add Photo</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Image *</label>
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} style={{ padding: '8px 12px' }} />
            </div>
            <div className="form-group">
              <label>Caption (optional)</label>
              <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. Field survey trip, 2026" />
            </div>
          </div>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner" /> : 'Add Photo'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={s.formTitle}>Photos ({list.length})</h2>
        {loading ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
          : list.length === 0 ? <div className="empty-state"><div className="icon">📷</div><p>No photos yet</p></div>
          : (
            <div style={s.grid}>
              {list.map(p => (
                <div key={p.id} style={s.card}>
                  <img src={p.imageUrl} alt={p.caption} style={s.thumb} />
                  <div style={{ padding: '8px 10px' }}>
                    {p.caption && <p style={s.caption}>{p.caption}</p>}
                    <button className="btn btn-red btn-sm" onClick={() => handleDelete(p.id)}>🗑️ Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  hint:      { color: 'var(--muted)', fontSize: 13, marginBottom: 24 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 },
  card:      { background: 'var(--card2)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' },
  thumb:     { width: '100%', height: 130, objectFit: 'cover' },
  caption:   { fontSize: 12, color: 'var(--muted)', marginBottom: 8 },
}
