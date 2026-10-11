import React, { useEffect, useState } from 'react'
import { getBusinesses, addBusiness, updateBusiness, deleteBusiness } from '../hooks/useFirestore'
import { uploadPhoto } from '../cloudinary'
import { useToast } from '../hooks/useToast'

const EMPTY = {
  name: '', shortDescription: '', description: '', ownerName: '',
  phone: '', whatsapp: '', email: '', website: '',
  logoUrl: '', ownerPhotoUrl: '', order: '', visible: true,
}

// Optional image picker: shows the current (or newly picked) image and lets the
// admin replace or remove it. Nothing is uploaded until the form is saved.
function ImageField({ label, hint, url, file, onPick, onRemove }) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!file) { setPreview(''); return }
    const u = URL.createObjectURL(file)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  const shown = preview || url
  return (
    <div className="form-group">
      <label>{label} <span style={{ color: 'var(--dim)', fontWeight: 400 }}>(optional)</span></label>
      <input type="file" accept="image/*" onChange={e => onPick(e.target.files[0] || null)} style={{ padding: '8px 12px' }} />
      {hint && <p style={s.fieldHint}>{hint}</p>}
      {shown && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <img src={shown} alt="" style={s.thumb} />
          <button type="button" className="btn btn-red btn-sm" onClick={onRemove}>🗑️ Remove</button>
        </div>
      )}
    </div>
  )
}

export default function BusinessesPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState(EMPTY)
  const [editId, setEditId]     = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [ownerFile, setOwnerFile] = useState(null)
  const [saving, setSaving]     = useState(false)
  const { show, Toast }         = useToast()

  const load = async () => { setLoading(true); setList(await getBusinesses()); setLoading(false) }
  useEffect(() => { load() }, [])

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  function startEdit(b) {
    setEditId(b.id)
    setForm({
      name: b.name || '',
      shortDescription: b.shortDescription || '',
      description: b.description || '',
      ownerName: b.ownerName || '',
      phone: b.phone || '',
      whatsapp: b.whatsapp || '',
      email: b.email || '',
      website: b.website || '',
      logoUrl: b.logoUrl || '',
      ownerPhotoUrl: b.ownerPhotoUrl || '',
      order: String(b.order && b.order !== 99 ? b.order : ''),
      visible: b.visible !== false,
    })
    setLogoFile(null); setOwnerFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() { setEditId(null); setForm(EMPTY); setLogoFile(null); setOwnerFile(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.shortDescription.trim()) {
      return show('Fill the business name and short description', 'error')
    }
    if (!form.phone.trim() && !form.whatsapp.trim() && !form.email.trim()) {
      return show('Add at least one contact (phone, WhatsApp or email)', 'error')
    }
    setSaving(true)
    try {
      // Images are optional. Keep the saved URL, replace it if a new file was
      // picked, or clear it if the admin pressed Remove (url already '').
      const [logoUrl, ownerPhotoUrl] = await Promise.all([
        logoFile  ? uploadPhoto(logoFile,  'gesa/businesses/logos')  : form.logoUrl,
        ownerFile ? uploadPhoto(ownerFile, 'gesa/businesses/owners') : form.ownerPhotoUrl,
      ])
      const data = {
        name: form.name.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        logoUrl, ownerPhotoUrl,
        order: Number(form.order) || 99,
        visible: !!form.visible,
      }
      editId ? await updateBusiness(editId, data) : await addBusiness(data)
      await load(); reset()
      show(editId ? 'Business updated!' : 'Business added!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    try {
      await deleteBusiness(id)
      if (editId === id) reset()
      await load(); show('Deleted.')
    } catch (err) { show(err.message, 'error') }
  }

  async function toggleVisible(b) {
    try {
      await updateBusiness(b.id, { visible: b.visible === false })
      await load()
      show(b.visible === false ? 'Business is now visible.' : 'Business hidden.')
    } catch (err) { show(err.message, 'error') }
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Business Hub</h1>
      <p style={s.hint}>
        Student businesses shown on the Business Hub page of the website and in the app.
        The hub's banner image and headline are set under <strong>Site: Content</strong>.
      </p>

      {/* Form */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>{editId ? '✏️ Edit Business' : '➕ Add Business'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Business name *</label><input value={form.name} onChange={set('name')} placeholder="e.g. Ama's Kitchen" /></div>
            <div className="form-group"><label>Owner name</label><input value={form.ownerName} onChange={set('ownerName')} placeholder="e.g. Ama Mensah" /></div>
          </div>
          <div className="form-group">
            <label>Short description * (shown on the card in the list)</label>
            <input value={form.shortDescription} onChange={set('shortDescription')} maxLength={120} placeholder="e.g. Home-made pastries and snacks delivered on campus" />
          </div>
          <div className="form-group">
            <label>Full description (shown on the business's own page)</label>
            <textarea value={form.description} onChange={set('description')} placeholder="What the business sells or does, prices, location, opening times…" style={{ minHeight: 110 }} />
          </div>

          <div className="form-row">
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={set('phone')} placeholder="+233 24 000 0001" /></div>
            <div className="form-group"><label>WhatsApp (leave empty to use the phone number)</label><input value={form.whatsapp} onChange={set('whatsapp')} placeholder="+233 24 000 0001" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="business@example.com" /></div>
            <div className="form-group">
              <label>Website <span style={{ color: 'var(--dim)', fontWeight: 400 }}>(optional)</span></label>
              <input value={form.website} onChange={set('website')} placeholder="e.g. amaskitchen.com" />
              <p style={s.fieldHint}>Leave empty if the business has no website.</p>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Order (1 = shown first)</label><input type="number" value={form.order} onChange={set('order')} placeholder="1" /></div>
            <div className="form-group" />
          </div>

          <div className="form-row">
            <ImageField
              label="Business logo"
              hint="Without a logo, the business's first letter is shown instead."
              url={form.logoUrl} file={logoFile}
              onPick={setLogoFile}
              onRemove={() => { setLogoFile(null); setForm(f => ({ ...f, logoUrl: '' })) }}
            />
            <ImageField
              label="Business owner photo"
              hint="Without a photo, that section is simply hidden."
              url={form.ownerPhotoUrl} file={ownerFile}
              onPick={setOwnerFile}
              onRemove={() => { setOwnerFile(null); setForm(f => ({ ...f, ownerPhotoUrl: '' })) }}
            />
          </div>

          <div className="form-group">
            <label style={s.checkRow}>
              <input type="checkbox" checked={!!form.visible} onChange={e => setForm(f => ({ ...f, visible: e.target.checked }))} style={s.checkbox} />
              <span>Visible — show this business on the website and in the app</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? <span className="spinner" /> : editId ? 'Update Business' : 'Save Business'}
            </button>
            {editId && <button type="button" className="btn btn-ghost" onClick={reset}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        <h2 style={s.formTitle}>All Businesses ({list.length})</h2>
        {loading ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
          : list.length === 0 ? <div className="empty-state"><div className="icon">🏪</div><p>No businesses yet</p></div>
          : (
            <table>
              <thead><tr><th>#</th><th>Logo</th><th>Business</th><th>Owner</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {list.map((b, i) => (
                  <tr key={b.id}>
                    <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                    <td>
                      <div className="avatar">
                        {b.logoUrl ? <img src={b.logoUrl} alt={b.name} /> : (b.name || '?').slice(0, 1).toUpperCase()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 12, maxWidth: 260 }}>{b.shortDescription}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{b.ownerName || '—'}</td>
                    <td style={{ color: 'var(--gold2)', fontSize: 12 }}>
                      {b.phone || b.whatsapp || '—'}
                      {b.email && <div>{b.email}</div>}
                    </td>
                    <td>
                      <span className={`badge ${b.visible === false ? 'badge-red' : 'badge-green'}`}>
                        {b.visible === false ? 'Hidden' : 'Visible'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(b)}>✏️ Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleVisible(b)}>{b.visible === false ? '👁️ Show' : '🙈 Hide'}</button>
                        <button className="btn btn-red btn-sm" onClick={() => handleDelete(b.id, b.name)}>🗑️ Delete</button>
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
  fieldHint: { color: 'var(--muted)', fontSize: 11, marginTop: 4 },
  thumb:     { width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(212,160,23,0.3)' },
  checkRow:  { display: 'flex', alignItems: 'flex-start', gap: 10, fontWeight: 400, fontSize: 13, color: 'var(--text)', cursor: 'pointer', lineHeight: 1.4 },
  checkbox:  { width: 18, height: 18, flex: 'none', marginTop: 1, padding: 0, accentColor: '#e8b82a' },
}
