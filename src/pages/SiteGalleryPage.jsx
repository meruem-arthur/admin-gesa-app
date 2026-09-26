import React, { useEffect, useState } from 'react'
import { getGalleryPhotos, addGalleryPhoto, deleteGalleryPhoto } from '../hooks/useFirestore'
import { uploadPhoto } from '../cloudinary'
import { useToast } from '../hooks/useToast'

export default function SiteGalleryPage() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [files, setFiles]     = useState([])
  const [saving, setSaving]   = useState(false)
  const [progress, setProgress] = useState(null)
  const { show, Toast }       = useToast()

  const load = async () => { setLoading(true); setList(await getGalleryPhotos()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!files.length) return show('Choose one or more images', 'error')
    if (!category) return show('Give this batch a category, e.g. "Old School Day"', 'error')
    setSaving(true)
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`)
        const imageUrl = await uploadPhoto(files[i], 'gesa/site/gallery')
        await addGalleryPhoto({ imageUrl, caption: category })
      }
      await load(); setFiles([]); setCategory('')
      show(`${files.length} photo${files.length > 1 ? 's' : ''} added!`)
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false); setProgress(null) }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this photo?')) return
    await deleteGalleryPhoto(id); await load(); show('Deleted.')
  }

  async function handleDeleteCategory(cat, items) {
    if (!confirm(`Remove all ${items.length} photos in "${cat}"?`)) return
    for (const p of items) await deleteGalleryPhoto(p.id)
    await load(); show('Category removed.')
  }

  // Group photos by category (the "caption" field) for display
  const groups = {}
  list.forEach(p => {
    const key = p.caption || 'Uncategorised'
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Site Gallery</h1>
      <p style={s.hint}>
        Photos shown on the public website's Gallery page, grouped by category.
        Select several photos at once for the same event/programme.
      </p>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Add Photos</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <input value={category} onChange={e => setCategory(e.target.value)} placeholder='e.g. "Old School Day 2026"' />
            </div>
            <div className="form-group">
              <label>Images * (select multiple)</label>
              <input type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files))} style={{ padding: '8px 12px' }} />
              {files.length > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{files.length} file(s) selected</span>}
            </div>
          </div>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner" /> : `Add ${files.length || ''} Photo${files.length === 1 ? '' : 's'}`}
          </button>
          {progress && <p style={{ fontSize: 12, color: 'var(--gold2)', marginTop: 8 }}>{progress}</p>}
        </form>
      </div>

      <div className="card">
        <h2 style={s.formTitle}>Photos ({list.length})</h2>
        {loading ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
          : list.length === 0 ? <div className="empty-state"><div className="icon">📷</div><p>No photos yet</p></div>
          : Object.entries(groups).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div style={s.catRow}>
                <p style={s.catTitle}>{cat} <span style={{ color: 'var(--dim)', fontWeight: 400 }}>({items.length})</span></p>
                <button className="btn btn-red btn-sm" onClick={() => handleDeleteCategory(cat, items)}>🗑️ Remove all</button>
              </div>
              <div style={s.grid}>
                {items.map(p => (
                  <div key={p.id} style={s.card}>
                    <img src={p.imageUrl} alt={p.caption} style={s.thumb} />
                    <button className="btn btn-red btn-sm" style={{ margin: 8 }} onClick={() => handleDelete(p.id)}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  hint:      { color: 'var(--muted)', fontSize: 13, marginBottom: 24, maxWidth: '60ch' },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  catRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catTitle:  { fontSize: 14, fontWeight: 700, color: 'var(--gold2)' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 },
  card:      { background: 'var(--card2)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' },
  thumb:     { width: '100%', height: 100, objectFit: 'cover' },
}
