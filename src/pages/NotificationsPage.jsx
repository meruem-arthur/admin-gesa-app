import React, { useState, useEffect } from 'react'
import { getAllPushTokens, sendPushNotification } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

// value = screen name in the student app; label = what you see here
const SCREEN_OPTIONS = [
  { value: 'Home',      label: 'Home (just open the app)' },
  { value: 'Timetable', label: 'Timetable' },
  { value: 'Materials', label: 'Materials' },
  { value: 'PastQ',     label: 'Past Questions' },
  { value: 'Events',    label: 'Events' },
  { value: 'Notice',    label: 'Announcements' },
  { value: 'Exams',     label: 'Exams' },
  { value: 'Business',  label: 'Business Hub' },
]
const screenLabel = v => SCREEN_OPTIONS.find(o => o.value === v)?.label || 'Home'

const QUICK_TEMPLATES = [
  { label: '📅 Exam reminder',    screen: 'Exams',     title: 'Exam Reminder',        body: 'Don\'t forget — your exam is coming up! Check the Exam Countdown in the GESA app.' },
  { label: '📢 New announcement', screen: 'Notice',    title: 'New Announcement',     body: 'A new announcement has been posted. Open the GESA app to read it.' },
  { label: '📚 New materials',    screen: 'Materials', title: 'New Study Materials',  body: 'New lecture notes have been uploaded. Check the Materials section in the app.' },
  { label: '📄 New past Q',       screen: 'PastQ',     title: 'New Past Questions',   body: 'New past exam questions have been added. Find them in the Past Questions section.' },
  { label: '🎉 Event reminder',   screen: 'Events',    title: 'Upcoming GESA Event',  body: 'There\'s an upcoming GESA event! Check the Events section for details.' },
]

export default function NotificationsPage() {
  const [title,       setTitle]       = useState('')
  const [body,        setBody]        = useState('')
  const [screen,      setScreen]      = useState('Home')
  const [sending,     setSending]     = useState(false)
  const [tokenCount,  setTokenCount]  = useState(null)
  const [history,     setHistory]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('notif_history') || '[]') } catch { return [] }
  })
  const { show, Toast } = useToast()

  useEffect(() => {
    getAllPushTokens().then(t => setTokenCount(t.length)).catch(() => setTokenCount(0))
  }, [])

  function applyTemplate(t) { setTitle(t.title); setBody(t.body); setScreen(t.screen || 'Home') }

  async function handleSend(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return show('Fill title and message', 'error')
    if (!confirm(`Send "${title}" to all ${tokenCount ?? '?'} registered devices?`)) return
    setSending(true)
    try {
      const r = await sendPushNotification(title.trim(), body.trim(), screen)
      const count = r.sent
      const entry = { title: title.trim(), body: body.trim(), sentAt: new Date().toISOString(), devices: count, screen }
      const updated = [entry, ...history].slice(0, 20)
      setHistory(updated)
      localStorage.setItem('notif_history', JSON.stringify(updated))
      setTitle(''); setBody(''); setScreen('Home')
      getAllPushTokens().then(t => setTokenCount(t.length)).catch(() => {})
      if (r.failed === 0) {
        show(`✅ Sent to ${count} device${count === 1 ? '' : 's'}!`)
      } else {
        const why = Object.entries(r.errors).map(([k, n]) => `${k} (${n})`).join(', ')
        show(`Sent to ${count}, but ${r.failed} failed: ${why}`, 'error')
      }
    } catch (err) { show(err.message, 'error') }
    finally { setSending(false) }
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Push Notifications</h1>

      {/* Device count */}
      <div style={s.deviceBar}>
        <span style={s.deviceIcon}>📱</span>
        <div>
          <div style={s.deviceCount}>
            {tokenCount === null ? 'Loading…' : `${tokenCount} registered device${tokenCount === 1 ? '' : 's'}`}
          </div>
          <div style={s.deviceSub}>All students who opened the GESA app</div>
        </div>
        <span style={{...s.dot, background: tokenCount > 0 ? 'var(--green)' : 'var(--dim)'}} />
      </div>

      {/* Quick templates */}
      <div className="card" style={{marginBottom:20}}>
        <h2 style={s.formTitle}>⚡ Quick Templates</h2>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {QUICK_TEMPLATES.map(t=>(
            <button key={t.label} className="btn btn-ghost btn-sm" onClick={()=>applyTemplate(t)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      <div className="card" style={{marginBottom:28}}>
        <h2 style={s.formTitle}>📤 Send Notification</h2>
        <form onSubmit={handleSend}>
          <div className="form-group">
            <label>Title *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Exam Reminder" maxLength={80} />
            <small style={{color:'var(--dim)',fontSize:11}}>{title.length}/80</small>
          </div>
          <div className="form-group">
            <label>Message *</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Write your message here…" maxLength={200} style={{minHeight:100}} />
            <small style={{color:'var(--dim)',fontSize:11}}>{body.length}/200</small>
          </div>

          <div className="form-group">
            <label>When a student taps it, open</label>
            <select value={screen} onChange={e=>setScreen(e.target.value)}>
              {SCREEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Preview */}
          {(title || body) && (
            <div style={s.preview}>
              <div style={s.previewLabel}>Preview</div>
              <div style={s.previewCard}>
                <div style={s.previewApp}>GESA UMaT</div>
                <div style={s.previewTitle}>{title || 'Title'}</div>
                <div style={s.previewBody}>{body || 'Message…'}</div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-gold"
            disabled={sending || tokenCount === 0}
            style={{marginTop:8}}
          >
            {sending
              ? <><span className="spinner"/> Sending…</>
              : `🔔 Send to ${tokenCount ?? '?'} devices`
            }
          </button>
          {tokenCount === 0 && (
            <p style={{color:'var(--dim)',fontSize:12,marginTop:8}}>No registered devices yet. Students need to open the app first.</p>
          )}
        </form>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <h2 style={s.formTitle}>📋 Send History (this browser)</h2>
          <table>
            <thead><tr><th>Title</th><th>Message</th><th>Opens</th><th>Devices</th><th>Sent</th></tr></thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td style={{fontWeight:600}}>{h.title}</td>
                  <td style={{color:'var(--muted)',fontSize:12,maxWidth:300}}>{h.body}</td>
                  <td style={{color:'var(--muted)',fontSize:12}}>{screenLabel(h.screen)}</td>
                  <td><span className="badge badge-green">{h.devices} devices</span></td>
                  <td style={{color:'var(--dim)',fontSize:12}}>
                    {new Date(h.sentAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                  </td>
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
  title:        { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 },
  formTitle:    { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  deviceBar:    { display: 'flex', alignItems: 'center', gap: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 },
  deviceIcon:   { fontSize: 28 },
  deviceCount:  { fontSize: 18, fontWeight: 700, color: 'var(--text)' },
  deviceSub:    { fontSize: 12, color: 'var(--muted)', marginTop: 2 },
  dot:          { width: 10, height: 10, borderRadius: 5, marginLeft: 'auto' },
  preview:      { background: 'var(--card2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: '1px solid var(--border)' },
  previewLabel: { fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  previewCard:  { background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '12px 14px' },
  previewApp:   { fontSize: 11, color: 'var(--gold2)', fontWeight: 600, marginBottom: 4 },
  previewTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  previewBody:  { fontSize: 13, color: 'var(--muted)' },
}
