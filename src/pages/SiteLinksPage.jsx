import React, { useEffect, useState } from 'react'
import { getSiteLinks, addSiteLink, updateSiteLink, deleteSiteLink } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

const EMPTY = { label: '', url: '', order: '' }

export default function SiteLinksPage() {
  const [list, setList]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]     = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const { show, Toast }     = useToast()

  const load = async () => { setLoading(true); setList(await getSiteLinks()); setLoading(false) }
  useEffect(() => { load() }, [])

  function startEdit(link) {
    setEditId(link.id)
    setForm({ label: link.label, url: link.url, order: link.order ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function reset() { setEditId(null); setForm(EMPTY) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.label || !form.url) return show('Fill label and URL', 'error')
    setSaving(true)
    try {
      const data = { label: form.label, url: form.url, order: Number(form.order) || list.length + 1 }
      editId ? await updateSiteLink(editId, data) : await addSiteLink(data)
      await load(); reset()
      show(editId ? 'Link updated!' : 'Link added!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, label) {
    if (!confirm(`Remove "${label}"?`)) return
    await deleteSiteLink(id); await load(); show('Deleted.')
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Important Links</h1>
      <p style={s.hint}>
        Shown in the footer of the public website, in order. Add as many as you like —
        dues, elections, a specific programme's page, anything with a URL.
      </p>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>{editId ? '✏️ Edit Link' : '➕ Add Link'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Label *</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Dues Payment Portal" />
            </div>
            <div className="form-group">
              <label>Order</label>
              <input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} placeholder={String(list.length + 1)} />
            </div>
          </div>
          <div className="form-group">
            <label>URL *</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? <span className="spinner" /> : editId ? 'Update' : 'Add Link'}
            </button>
            {editId && <button type="button" className="btn btn-ghost" onClick={reset}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={s.formTitle}>All Links ({list.length})</h2>
        {loading ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
          : list.length === 0 ? <div className="empty-state"><div className="icon">🔗</div><p>No links yet</p></div>
          : (
            <table>
              <thead><tr><th>Order</th><th>Label</th><th>URL</th><th>Actions</th></tr></thead>
              <tbody>
                {list.map(l => (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--muted)' }}>{l.order}</td>
                    <td style={{ fontWeight: 600 }}>{l.label}</td>
                    <td style={{ color: 'var(--blue)', fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={l.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{l.url}</a>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(l)}>✏️ Edit</button>
                        <button className="btn btn-red btn-sm" onClick={() => handleDelete(l.id, l.label)}>🗑️</button>
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
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  hint:      { color: 'var(--muted)', fontSize: 13, marginBottom: 24, maxWidth: '60ch' },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
}
