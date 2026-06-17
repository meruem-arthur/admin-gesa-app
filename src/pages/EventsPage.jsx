import React, { useEffect, useState } from 'react'
import { getEvents, addEvent, deleteEvent } from '../hooks/useFirestore'
import { uploadPhoto } from '../cloudinary'
import { useToast } from '../hooks/useToast'

const TAGS  = ['General', 'Academic', 'Formal', 'Social', 'Trip']
const EMPTY = { title: '', description: '', date: '', location: '', tag: 'General', featured: false }

function fmtDate(val) {
  if (!val) return ''
  const d = val.toDate ? val.toDate() : new Date(val)
  return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

export default function EventsPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState(EMPTY)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [progress, setProgress] = useState('')
  const { show, Toast }         = useToast()

  const load = async () => { setLoading(true); setList(await getEvents()); setLoading(false) }
  useEffect(() => { load() }, [])

  function handleImagePick(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.date) return show('Fill title and date', 'error')
    setSaving(true)
    try {
      let imageUrl = ''
      if (imageFile) {
        setProgress('Uploading image…')
        imageUrl = await uploadPhoto(imageFile, 'gesa/events')
      }
      setProgress('Saving event…')
      await addEvent({ ...form, imageUrl })
      await load()
      setForm(EMPTY)
      setImageFile(null)
      setImagePreview(null)
      setProgress('')
      show('Event added!')
    } catch (err) { show(err.message, 'error'); setProgress('') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, title) {
    if (!confirm(`Delete "${title}"?`)) return
    await deleteEvent(id); await load(); show('Deleted.')
  }

  const now      = new Date()
  const upcoming = list.filter(e => (e.date?.toDate ? e.date.toDate() : new Date(e.date)) >= now)
  const past     = list.filter(e => (e.date?.toDate ? e.date.toDate() : new Date(e.date)) < now)

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Events</h1>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Add Event</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Title *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. GESA General Meeting" /></div>
            <div className="form-group"><label>Location</label><input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. LT1, Essikado Campus" /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date & Time *</label>
              <input value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} placeholder="e.g. 2025-06-01T10:00:00Z" />
              <small style={{color:'var(--dim)',fontSize:11}}>Format: YYYY-MM-DDTHH:MM:SSZ</small>
            </div>
            <div className="form-group">
              <label>Tag</label>
              <div className="chip-group" style={{marginTop:6}}>
                {TAGS.map(t=>(
                  <span key={t} className={`chip${form.tag===t?' active':''}`} onClick={()=>setForm(f=>({...f,tag:t}))}>{t}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Details about the event…" /></div>

          {/* Event image / flyer */}
          <div className="form-group">
            <label>Event Image / Flyer <span style={{color:'var(--muted)',fontWeight:400}}>(optional)</span></label>
            <input type="file" accept="image/*" onChange={handleImagePick} style={{padding:'8px 12px'}} />
            {imagePreview && (
              <div style={{marginTop:10,position:'relative',display:'inline-block'}}>
                <img src={imagePreview} alt="Preview" style={{width:'100%',maxWidth:320,borderRadius:8,border:'1px solid var(--border)',display:'block'}} />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:14,lineHeight:'24px',textAlign:'center'}}
                >✕</button>
              </div>
            )}
          </div>

          <div className="form-group" style={{display:'flex',alignItems:'center',gap:10}}>
            <input type="checkbox" id="featured" checked={form.featured} onChange={e=>setForm(f=>({...f,featured:e.target.checked}))} style={{width:'auto'}} />
            <label htmlFor="featured" style={{margin:0,textTransform:'none',fontSize:13,color:'var(--muted)'}}>Mark as featured event</label>
          </div>
          {progress && <p style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>⏳ {progress}</p>}
          <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? <span className="spinner"/> : 'Add Event'}</button>
        </form>
      </div>

      {/* Upcoming */}
      <div className="card" style={{marginBottom:20}}>
        <h2 style={s.formTitle}>Upcoming ({upcoming.length})</h2>
        {loading ? <div style={{textAlign:'center',padding:32}}><span className="spinner"/></div>
          : upcoming.length===0 ? <div className="empty-state"><div className="icon">📅</div><p>No upcoming events</p></div>
          : (
            <table>
              <thead><tr><th>Image</th><th>Title</th><th>Date</th><th>Location</th><th>Tag</th><th>Actions</th></tr></thead>
              <tbody>
                {upcoming.map(ev=>(
                  <tr key={ev.id}>
                    <td>
                      {ev.imageUrl
                        ? <img src={ev.imageUrl} alt="" style={{width:48,height:36,objectFit:'cover',borderRadius:4,border:'1px solid var(--border)'}} />
                        : <span style={{color:'var(--dim)',fontSize:11}}>—</span>}
                    </td>
                    <td style={{fontWeight:600}}>{ev.title}{ev.featured && <span className="badge badge-gold" style={{marginLeft:8}}>Featured</span>}</td>
                    <td style={{color:'var(--gold2)',fontSize:12}}>{fmtDate(ev.date)}</td>
                    <td style={{color:'var(--muted)',fontSize:12}}>{ev.location}</td>
                    <td><span className="badge badge-purple">{ev.tag}</span></td>
                    <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(ev.id,ev.title)}>🗑️ Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div className="card" style={{opacity:0.6}}>
          <h2 style={s.formTitle}>Past Events ({past.length})</h2>
          <table>
            <thead><tr><th>Title</th><th>Date</th><th>Location</th><th>Actions</th></tr></thead>
            <tbody>
              {past.map(ev=>(
                <tr key={ev.id}>
                  <td style={{color:'var(--muted)'}}>{ev.title}</td>
                  <td style={{color:'var(--dim)',fontSize:12}}>{fmtDate(ev.date)}</td>
                  <td style={{color:'var(--dim)',fontSize:12}}>{ev.location}</td>
                  <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(ev.id,ev.title)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
}
