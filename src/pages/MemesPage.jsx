import React, { useEffect, useMemo, useState } from 'react'
import {
  getMemes, addMeme, updateMeme, deleteMeme,
  getPinnedMemeId, setPinnedMemeId, pickMemeOfTheDay,
} from '../hooks/useFirestore'
import { uploadPhoto } from '../cloudinary'
import { useToast } from '../hooks/useToast'

export default function MemesPage() {
  const [memes, setMemes]       = useState([])
  const [pinnedId, setPinnedId] = useState('')
  const [loading, setLoading]   = useState(true)
  const [files, setFiles]       = useState([])
  const [reserve, setReserve]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [progress, setProgress] = useState(null)
  const [busyId, setBusyId]     = useState(null)
  const { show, Toast }         = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [m, p] = await Promise.all([getMemes(), getPinnedMemeId()])
      setMemes(m); setPinnedId(p)
    } catch (err) { show(err.message, 'error') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const rotation = useMemo(() => memes.filter(m => !m.reserved), [memes])
  const reserved = useMemo(() => memes.filter(m => m.reserved), [memes])

  // A pin only counts if that meme still exists.
  const pinned  = memes.find(m => m.id === pinnedId) || null
  const liveId  = pickMemeOfTheDay(memes, pinnedId)?.id
  const rotationIndexToday = pinned ? -1 : rotation.findIndex(m => m.id === liveId)

  async function handleUpload(e) {
    e.preventDefault()
    if (!files.length) return show('Choose one or more images', 'error')
    setSaving(true)
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`)
        const imageUrl = await uploadPhoto(files[i], 'gesa/memes')
        await addMeme({ imageUrl, reserved: reserve })
      }
      await load()
      show(`${files.length} meme${files.length > 1 ? 's' : ''} added${reserve ? ' to reserved' : ' to the daily rotation'}!`)
      setFiles([]); setReserve(false)
      e.target.reset()
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false); setProgress(null) }
  }

  async function handlePin(m) {
    setBusyId(m.id)
    try {
      await setPinnedMemeId(m.id)
      setPinnedId(m.id)
      show('This meme is now showing in the app until you change it.')
    } catch (err) { show(err.message, 'error') }
    setBusyId(null)
  }

  async function handleUnpin() {
    setBusyId('unpin')
    try {
      await setPinnedMemeId('')
      setPinnedId('')
      show('Back to the daily rotation.')
    } catch (err) { show(err.message, 'error') }
    setBusyId(null)
  }

  async function handleToggleReserved(m) {
    setBusyId(m.id)
    try {
      // A pinned meme is always a reserved one; moving it into the rotation releases the pin.
      if (m.id === pinnedId && m.reserved) { await setPinnedMemeId(''); setPinnedId('') }
      await updateMeme(m.id, { reserved: !m.reserved })
      setMemes(list => list.map(x => (x.id === m.id ? { ...x, reserved: !m.reserved } : x)))
      show(m.reserved ? 'Moved to the daily rotation.' : 'Moved to reserved.')
    } catch (err) { show(err.message, 'error') }
    setBusyId(null)
  }

  async function handleDelete(m) {
    if (!confirm('Delete this meme?')) return
    setBusyId(m.id)
    try {
      if (m.id === pinnedId) { await setPinnedMemeId(''); setPinnedId('') }
      await deleteMeme(m.id)
      setMemes(list => list.filter(x => x.id !== m.id))
      show('Deleted.')
    } catch (err) { show(err.message, 'error') }
    setBusyId(null)
  }

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Exam Countdown Memes</h1>
      <p style={s.hint}>
        Upload memes and the app shows a different one each day, cycling through the rotation in the order you uploaded them.
        Mark a meme as <strong>reserved</strong> to keep it out of the rotation. A reserved meme only shows when you pin it, and stays
        until you pin another one or go back to the daily rotation.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={s.formTitle}>Showing in the app now</h2>
        {loading ? <span className="spinner" /> : (
          <div style={s.nowRow}>
            {liveId
              ? <img src={memes.find(m => m.id === liveId)?.imageUrl} alt="" style={s.nowImg} />
              : <div style={{ ...s.nowImg, ...s.nowEmpty }}>Default</div>}
            <div style={{ flex: 1, minWidth: 200 }}>
              {pinned ? (
                <>
                  <span className="badge badge-gold">📌 Pinned reserved meme</span>
                  <p style={s.hintSm}>Every student sees this meme until you change it.</p>
                  <button className="btn btn-ghost btn-sm" onClick={handleUnpin} disabled={busyId === 'unpin'}>
                    {busyId === 'unpin' ? <span className="spinner" /> : '🔄 Back to daily rotation'}
                  </button>
                </>
              ) : liveId ? (
                <>
                  <span className="badge badge-green">🔄 Daily rotation</span>
                  <p style={s.hintSm}>
                    Meme {rotationIndexToday + 1} of {rotation.length} in the rotation. Tomorrow the app moves to the next one.
                  </p>
                </>
              ) : (
                <>
                  <span className="badge badge-purple">Default meme</span>
                  <p style={s.hintSm}>No memes in the rotation yet, so the app shows its built-in meme. Upload one below.</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Add Memes</h2>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Images * (select multiple)</label>
            <input type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files))} style={{ padding: '8px 12px' }} />
            {files.length > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{files.length} file(s) selected</span>}
          </div>
          <label style={s.checkRow}>
            <input type="checkbox" checked={reserve} onChange={e => setReserve(e.target.checked)} style={s.checkbox} />
            <span>Reserve {files.length > 1 ? 'these memes' : 'this meme'}: keep out of the daily rotation, show only when I pin it</span>
          </label>
          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? <><span className="spinner" /> {progress}</> : '🖼️ Upload'}
            </button>
          </div>
        </form>
      </div>

      <MemeSection
        title={`Daily rotation (${rotation.length})`}
        empty="No memes in the rotation yet"
        loading={loading}
        list={rotation}
        liveId={liveId}
        pinnedId={pinnedId}
        busyId={busyId}
        onToggleReserved={handleToggleReserved}
        onDelete={handleDelete}
      />

      <MemeSection
        title={`Reserved (${reserved.length})`}
        empty="No reserved memes. Tick “Reserve” when uploading, or use “Reserve” on a meme above."
        loading={loading}
        list={reserved}
        liveId={liveId}
        pinnedId={pinnedId}
        busyId={busyId}
        onPin={handlePin}
        onToggleReserved={handleToggleReserved}
        onDelete={handleDelete}
      />
    </div>
  )
}

function MemeSection({ title, empty, loading, list, liveId, pinnedId, busyId, onPin, onToggleReserved, onDelete }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={s.formTitle}>{title}</h2>
      {loading ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
        : list.length === 0 ? <div className="empty-state"><div className="icon">🖼️</div><p>{empty}</p></div>
        : (
          <div style={s.grid}>
            {list.map((m, i) => {
              const busy = busyId === m.id
              return (
                <div key={m.id} style={{ ...s.tile, ...(m.id === liveId ? s.tileLive : {}) }}>
                  <img src={m.imageUrl} alt="" style={s.img} loading="lazy" />
                  <div style={s.tileBody}>
                    <div style={{ minHeight: 24 }}>
                      {m.id === pinnedId
                        ? <span className="badge badge-gold">📌 Pinned</span>
                        : m.id === liveId
                          ? <span className="badge badge-green">Showing today</span>
                          : !m.reserved && <span style={s.num}>#{i + 1}</span>}
                    </div>
                    <div style={s.actions}>
                      {m.reserved && m.id !== pinnedId && (
                        <button className="btn btn-gold btn-sm" disabled={busy} onClick={() => onPin(m)}>Show this now</button>
                      )}
                      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onToggleReserved(m)}>
                        {m.reserved ? 'Move to rotation' : 'Reserve'}
                      </button>
                      <button className="btn btn-red btn-sm" disabled={busy} onClick={() => onDelete(m)}>🗑️</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  hint:      { color: 'var(--muted)', fontSize: 13, marginBottom: 20, maxWidth: '70ch', lineHeight: 1.6 },
  hintSm:    { color: 'var(--muted)', fontSize: 12, margin: '8px 0 12px', lineHeight: 1.5 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  checkRow:  { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 400, fontSize: 13, color: 'var(--text)', cursor: 'pointer' },
  checkbox:  { width: 18, height: 18, flex: 'none', padding: 0, accentColor: '#e8b82a' },
  nowRow:    { display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  nowImg:    { width: 160, height: 120, objectFit: 'contain', borderRadius: 10, background: 'var(--card2)', flex: 'none' },
  nowEmpty:  { display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: 12 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  tile:      { background: 'var(--card2)', borderRadius: 10, overflow: 'hidden', border: '1px solid transparent' },
  tileLive:  { borderColor: 'rgba(212,160,23,0.55)' },
  img:       { width: '100%', height: 140, objectFit: 'contain', display: 'block', background: 'rgba(0,0,0,0.15)' },
  tileBody:  { padding: 10 },
  num:       { fontSize: 11, color: 'var(--dim)' },
  actions:   { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 },
}
