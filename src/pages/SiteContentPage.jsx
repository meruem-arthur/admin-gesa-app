import React, { useEffect, useState } from 'react'
import { getSiteContent, updateSiteContent } from '../hooks/useFirestore'
import { uploadPhoto } from '../cloudinary'
import { useToast } from '../hooks/useToast'

const EMPTY = {
  tagline: 'The Eye of the Engineer', campus: 'Essikado', aboutText: '',
  contactEmail: '', contactPhone: '',
  sidebarImageUrl: '', aboutHeroImageUrl: '', aboutSecondImageUrl: '', contactHeroImageUrl: '',
  libraryHeroImageUrl: '', eventsHeroImageUrl: '', executivesHeroImageUrl: '',
  vision: '', mission: '', coreValues: '', activities: '',
}

// Each entry: the siteContent field it writes, the Cloudinary folder, and its label/hint
const IMAGE_FIELDS = [
  { key: 'sidebarImageUrl',        folder: 'gesa/site/sidebar',    label: 'Sidebar background image',     hint: 'Shown behind the mobile navigation menu on the public site.' },
  { key: 'aboutHeroImageUrl',      folder: 'gesa/site/about',      label: 'About page — hero image',      hint: 'Top banner image on the About page.' },
  { key: 'aboutSecondImageUrl',    folder: 'gesa/site/about',      label: 'About page — secondary image', hint: 'Image shown alongside the "Who Are We" section.' },
  { key: 'contactHeroImageUrl',    folder: 'gesa/site/contact',    label: 'Contact page — hero image',    hint: 'Top banner image on the Contact page.' },
  { key: 'libraryHeroImageUrl',    folder: 'gesa/site/library',    label: 'Library page — hero image',    hint: 'Top banner image on the Library page.' },
  { key: 'eventsHeroImageUrl',     folder: 'gesa/site/events',     label: 'Events page — hero image',     hint: 'Top banner image on the Events page.' },
  { key: 'executivesHeroImageUrl', folder: 'gesa/site/executives', label: 'Executives page — hero image', hint: 'Top banner image on the Executives page.' },
]

export default function SiteContentPage() {
  const [form, setForm]           = useState(EMPTY)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [uploadingKey, setUploadingKey] = useState(null)
  const { show, Toast }           = useToast()

  useEffect(() => {
    getSiteContent().then(d => { setForm({ ...EMPTY, ...d }); setLoading(false) })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSiteContent(form)
      show('Site content updated!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  // Image pickers save immediately on upload, so admins don't lose a
  // successful upload if they forget to hit "Save Changes" afterwards.
  async function handlePickImage(key, folder, file) {
    if (!file) return
    setUploadingKey(key)
    try {
      const imageUrl = await uploadPhoto(file, folder)
      setForm(f => ({ ...f, [key]: imageUrl }))
      await updateSiteContent({ [key]: imageUrl })
      show('Image updated!')
    } catch (err) { show(err.message, 'error') }
    finally { setUploadingKey(null) }
  }

  async function handleRemoveImage(key) {
    if (!confirm('Remove this image?')) return
    setForm(f => ({ ...f, [key]: '' }))
    try { await updateSiteContent({ [key]: '' }); show('Image removed.') }
    catch (err) { show(err.message, 'error') }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Site Content</h1>
      <p style={s.hint}>Text and images shown on the public website's homepage, About and Contact pages.</p>

      <div className="card" style={{ marginBottom: 28 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Hero tagline (also used as the About page slogan)</label>
              <input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="The Eye of the Engineer" />
            </div>
            <div className="form-group">
              <label>Campus name</label>
              <input value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value }))} placeholder="Essikado" />
            </div>
          </div>
          <div className="form-group">
            <label>About text</label>
            <textarea value={form.aboutText} onChange={e => setForm(f => ({ ...f, aboutText: e.target.value }))} placeholder="Who GESA is and what the association does…" style={{ minHeight: 140 }} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Vision</label>
              <textarea value={form.vision} onChange={e => setForm(f => ({ ...f, vision: e.target.value }))} placeholder="To be a leading student association promoting…" style={{ minHeight: 90 }} />
            </div>
            <div className="form-group">
              <label>Mission</label>
              <textarea value={form.mission} onChange={e => setForm(f => ({ ...f, mission: e.target.value }))} placeholder="To empower students through academic support…" style={{ minHeight: 90 }} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Core values (one per line, "Label: description")</label>
              <textarea value={form.coreValues} onChange={e => setForm(f => ({ ...f, coreValues: e.target.value }))} placeholder={'Integrity: Upholding ethical standards in all activities.\nExcellence: Striving for academic and professional distinction.'} style={{ minHeight: 120 }} />
            </div>
            <div className="form-group">
              <label>Activities (one per line, "Label: description")</label>
              <textarea value={form.activities} onChange={e => setForm(f => ({ ...f, activities: e.target.value }))} placeholder={'Academic: Lectures, workshops, and study trips.\nProfessional: Networking sessions with industry experts.'} style={{ minHeight: 120 }} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Contact email</label>
              <input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="gesa.essikado@umat.edu.gh" />
            </div>
            <div className="form-group">
              <label>Contact phone</label>
              <input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+233 24 000 0000" />
            </div>
          </div>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={s.formTitle}>🖼️ Page Images</h2>
        <p style={s.hint}>
          Pick an image straight from your device — it uploads to Cloudinary automatically and
          saves right away, no URL needed.
        </p>
        <div style={s.imageGrid}>
          {IMAGE_FIELDS.map(({ key, folder, label, hint }) => (
            <div key={key} style={s.imageCard}>
              <div style={s.imagePreviewWrap}>
                {form[key] ? (
                  <img src={form[key]} alt={label} style={s.imagePreview} />
                ) : (
                  <div style={s.imagePlaceholder}>No image set</div>
                )}
              </div>
              <p style={s.imageLabel}>{label}</p>
              <p style={s.imageHint}>{hint}</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <label className="btn btn-gold btn-sm" style={{ cursor: 'pointer' }}>
                  {uploadingKey === key ? <span className="spinner" /> : (form[key] ? 'Replace' : 'Upload')}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={uploadingKey === key}
                    onChange={e => {
                      const file = e.target.files[0]
                      handlePickImage(key, folder, file)
                      e.target.value = ''
                    }}
                  />
                </label>
                {form[key] && (
                  <button type="button" className="btn btn-red btn-sm" onClick={() => handleRemoveImage(key)} disabled={uploadingKey === key}>
                    🗑️ Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  hint:      { color: 'var(--muted)', fontSize: 13, marginBottom: 24, maxWidth: '60ch' },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 4 },
  imageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16, marginTop: 16 },
  imageCard: { background: 'var(--card2)', borderRadius: 12, border: '1px solid var(--border)', padding: 12 },
  imagePreviewWrap: { width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', background: 'var(--bg, #0d0a1a)', marginBottom: 10 },
  imagePreview: { width: '100%', height: '100%', objectFit: 'cover' },
  imagePlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: 12 },
  imageLabel: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  imageHint:  { fontSize: 11, color: 'var(--muted)', marginTop: 2 },
}
