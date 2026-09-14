import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

// ── GESA logo from Cloudinary — no local file needed ──
const LOGO_URL = 'https://res.cloudinary.com/df9ns044o/image/upload/v1779677619/gesa-logo_am7hpu.jpg'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [pwd, setPwd]         = useState('')
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)
  const [imgError, setImgError] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      // Signing in is all this does — App.jsx watches auth state and checks
      // the /admins collection before granting access to the dashboard.
      await signInWithEmailAndPassword(auth, email.trim(), pwd)
    } catch (error) {
      switch (error.code) {
        case 'auth/invalid-email':
          setErr('That email address looks invalid.')
          break
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setErr('Incorrect email or password.')
          break
        case 'auth/too-many-requests':
          setErr('Too many attempts. Try again in a few minutes.')
          break
        default:
          setErr('Something went wrong. Please try again.')
      }
      setLoading(false)
    }
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
            <div style={s.logoFallback}>
              GE<span style={{ color: '#e8b82a' }}>SA</span>
            </div>
          )}
        </div>

        <h1 style={s.title}>GESA Admin Dashboard</h1>
        <p style={s.sub}>Geomatic Engineering Students Association · UMaT</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 28, width: '100%' }}>
          <div className="form-group">
            <label>Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErr('') }}
              placeholder="you@example.com"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Password</label>
            <input
              type="password"
              value={pwd}
              onChange={e => { setPwd(e.target.value); setErr('') }}
              placeholder="Enter password"
              autoComplete="current-password"
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
    background: 'rgba(23,19,46,0.35)',
    backdropFilter: 'blur(32px) saturate(180%)',
    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 24,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 24px 64px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
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
