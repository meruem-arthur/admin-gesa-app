import React, { useEffect, useState } from 'react'
import { getSiteContent, updateSiteContent } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

const EMPTY = { tagline: 'The Eye of the Engineer', campus: 'Essikado', aboutText: '', contactEmail: '', contactPhone: '' }

export default function SiteContentPage() {
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const { show, Toast }       = useToast()

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

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Site Content</h1>
      <p style={s.hint}>Text shown on the public website's homepage, About and Contact pages.</p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Hero tagline</label>
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
    </div>
  )
}

const s = {
  title: { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  hint:  { color: 'var(--muted)', fontSize: 13, marginBottom: 24 },
}
