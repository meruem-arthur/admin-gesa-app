import React, { useState } from 'react'

const ADMIN_PASSWORD = 'Bond442@love1'

// ── GESA logo from Cloudinary — no local file needed ──
// Replace with your actual Cloudinary URL after uploading the logo once
const LOGO_URL = 'https://res.cloudinary.com/df9ns044o/image/upload/gesa/photos/gesa-logo'

export default function LoginPage({ onLogin }) {
  const [pwd, setPwd]         = useState('')
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)
  const [imgError, setImgError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      if (pwd === ADMIN_PASSWORD) { onLogin() }
      else { setErr('Incorrect password.'); setLoading(false) }
    }, 600)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logoWrap}>
          {!imgError ? (
            <img
              src={LOGO_URL}
              alt="GESA"
              style={s.logoImg}
              onError={() => setImgError(true)}
            />
          ) : (
            // Fallback if image not uploaded yet
            <div style={s.logoFallback}>
              GE<span style={{ color: '#e8b82a' }}>SA</span>
            </div>
          )}
        </div>

        <h1 style={s.title}>GESA Admin Dashboard</h1>
        <p style={s.sub}>Geomatic Engineering Students Association · UMaT</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 28, width: '100%' }}>
          <div className="form-group">
            <label>Admin Password</label>
            <input
              type="password"
              value={pwd}
              onChange={e => { setPwd(e.target.value); setErr('') }}
              placeholder="Enter password"
              autoFocus
            />
            {err && <p style={s.err}>{err}</p>}
          </div>
          <button
            type="submit"
            className="btn btn-gold"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: 13 }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : '🔓 Unlock Dashboard'}
          </button>
        </form>

        <p style={s.hint}>The Eye of the Engineer · Essikado Campus</p>
      </div>
    </div>
  )
}

const s = {
  page: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    padding: 24,
    zIndex: 10,
  },
  card: {
    background: 'rgba(23,19,46,0.88)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(212,160,23,0.28)',
    borderRadius: 24,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
  },
  logoWrap: {
    width: 100, height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    border: '3px solid rgba(212,160,23,0.5)',
    marginBottom: 20,
    backgroundColor: '#5b21b6',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg:      { width: '100%', height: '100%', objectFit: 'cover' },
  logoFallback: { fontSize: 24, fontWeight: 800, color: '#fff' },
  title: { fontSize: 20, fontWeight: 800, color: '#f0ecff', margin: 0 },
  sub:   { fontSize: 13, color: '#9b8ec0', marginTop: 6 },
  err:   { color: '#f87171', fontSize: 12, marginTop: 6, textAlign: 'left' },
  hint:  { fontSize: 11, color: '#584f7a', marginTop: 28 },
}
