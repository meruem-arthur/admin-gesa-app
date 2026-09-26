import React, { useEffect, useState } from 'react'
import { getHeroSlides, addHeroSlide, deleteHeroSlide } from '../hooks/useFirestore'
import { uploadPhoto } from '../cloudinary'
import { useToast } from '../hooks/useToast'

export default function HeroSlidesPage() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [caption, setCaption] = useState('')
  const [files, setFiles]     = useState([])
  const [saving, setSaving]   = useState(false)
  const [progress, setProgress] = useState(null)
  const { show, Toast }       = useToast()

  const load = async () => { setLoading(true); setList(await getHeroSlides()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!files.length) return show('Choose one or more images', 'error')
    setSaving(true)
    try {
      let nextOrder = list.length ? Math.max(...list.map(s => s.order || 0)) + 1 : 1
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`)
        const imageUrl = await uploadPhoto(files[i], 'gesa/site/hero')
        await addHeroSlide({ imageUrl, caption, order: nextOrder++ })
      }
      await load(); setFiles([]); setCaption('')
      show(`${files.length} slide${files.length > 1 ? 's' : ''} added!`)
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false); setProgress(null) }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this slide?')) return
    await deleteHeroSlide(id); await load(); show('Deleted.')
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Homepage Slideshow</h1>
      <p style={s.hint}>
        These images rotate at the top of the public website. Select several at once
        to add them all in one go — they'll be numbered in the order you add them.
      </p>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Add Slides</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Images * (select multiple)</label>
              <input type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files))} style={{ padding: '8px 12px' }} />
              {files.length > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{files.length} file(s) selected</span>}
            </div>
            <div className="form-group">
              <label>Caption (optional, applies to all selected)</label>
              <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. GESA Freshers' Night 2026" />
            </div>
          </div>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner" /> : `Add ${files.length || ''} Slide${files.length === 1 ? '' : 's'}`}
          </button>
          {progress && <p style={{ fontSize: 12, color: 'var(--gold2)', marginTop: 8 }}>{progress}</p>}
        </form>
      </div>

      <div className="card">
        <h2 style={s.formTitle}>Slides ({list.length})</h2>
        {loading ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
          : list.length === 0 ? <div className="empty-state"><div className="icon">🖼️</div><p>No slides yet</p></div>
          : (
            <div style={s.grid}>
              {list.map(sl => (
                <div key={sl.id} style={s.slideCard}>
                  <img src={sl.imageUrl} alt={sl.caption} style={s.thumb} />
                  <div style={{ padding: '8px 10px' }}>
                    <p style={s.order}>#{sl.order} {sl.caption}</p>
                    <button className="btn btn-red btn-sm" onClick={() => handleDelete(sl.id)}>🗑️ Remove</button>
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
  hint:      { color: 'var(--muted)', fontSize: 13, marginBottom: 24, maxWidth: '60ch' },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 },
  slideCard: { background: 'var(--card2)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' },
  thumb:     { width: '100%', height: 110, objectFit: 'cover' },
  order:     { fontSize: 12, color: 'var(--muted)', marginBottom: 8 },
}
