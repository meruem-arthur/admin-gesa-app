import React, { useState } from 'react'

const ADMIN_PASSWORD = 'Bond442@love1'

export default function LoginPage({ onLogin }) {
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

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
        <div style={s.logoBox}>
          <span style={s.logo}>GE<span style={{ color: '#e8b82a' }}>SA</span></span>
        </div>
        <h1 style={s.title}>GESA Admin Dashboard</h1>
        <p style={s.sub}>Geomatic Engineering Students Association · UMaT</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
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
          <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? <span className="spinner" /> : '🔓 Unlock Dashboard'}
          </button>
        </form>

        <p style={s.hint}>The Eye of the Engineer · Essikado Campus</p>
      </div>
    </div>
  )
}

const s = {
  page:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 },
  card:    { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 400, textAlign: 'center' },
  logoBox: { marginBottom: 16 },
  logo:    { fontSize: 32, fontWeight: 800, color: '#fff' },
  title:   { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 12 },
  sub:     { fontSize: 13, color: 'var(--muted)', marginTop: 6 },
  err:     { color: 'var(--red)', fontSize: 12, marginTop: 6, textAlign: 'left' },
  hint:    { fontSize: 11, color: 'var(--dim)', marginTop: 28 },
}
