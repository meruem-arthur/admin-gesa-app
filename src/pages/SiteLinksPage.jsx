import React, { useEffect, useState } from 'react'
import { getSiteLinks, updateSiteLinks } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

const EMPTY = { duesUrl: '', electionUrl: '', studentsPortalUrl: '', vleUrl: '', internshipUrl: '' }

const FIELDS = [
  { key: 'duesUrl',            label: 'Dues Payment Portal', placeholder: 'https://…' },
  { key: 'electionUrl',        label: 'Election Portal',     placeholder: 'https://…' },
  { key: 'studentsPortalUrl',  label: "Students' Portal",    placeholder: 'https://portal.umat.edu.gh/' },
  { key: 'vleUrl',             label: 'UMaT VLE',             placeholder: 'https://elearning.umat.edu.gh/' },
  { key: 'internshipUrl',      label: 'Internship Portal',    placeholder: 'https://…' },
]

export default function SiteLinksPage() {
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const { show, Toast }       = useToast()

  useEffect(() => {
    getSiteLinks().then(d => { setForm({ ...EMPTY, ...d }); setLoading(false) })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSiteLinks(form)
      show('Links updated!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Important Links</h1>
      <p style={s.hint}>Shown in the footer of the public website. Leave blank to hide a link.</p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {FIELDS.map(f => (
            <div className="form-group" key={f.key}>
              <label>{f.label}</label>
              <input
                value={form[f.key]}
                onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save Links'}
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
