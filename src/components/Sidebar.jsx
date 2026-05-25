import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',              icon: '📊', label: 'Dashboard'      },
  { to: '/executives',    icon: '🎖️', label: 'Executives'     },
  { to: '/lecturers',     icon: '🎓', label: 'Lecturers'      },
  { to: '/events',        icon: '📅', label: 'Events'         },
  { to: '/announcements', icon: '📢', label: 'Announcements'  },
  { to: '/words',         icon: '📖', label: 'Word of Day'    },
  { to: '/materials',     icon: '📚', label: 'Materials'      },
  { to: '/pastquestions', icon: '📄', label: 'Past Questions' },
  { to: '/exams',         icon: '⏰', label: 'Exams'          },
  { to: '/notifications', icon: '🔔', label: 'Notifications'  },
  { to: '/forum',         icon: '💬', label: 'Forum'          },
]

// ── GESA logo hosted on Cloudinary — no local file needed ──
// Replace this URL with the actual Cloudinary URL of your GESA logo
// after you upload it once to cloudinary.com
const LOGO_URL = 'https://res.cloudinary.com/df9ns044o/image/upload/v1779677619/gesa-logo_am7hpu.jpg'

export default function Sidebar({ onLogout }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [open, setOpen]         = useState(false)

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function handleNavClick() {
    if (isMobile) setOpen(false)
  }

  const sidebarVisible = !isMobile || open

  return (
    <>
      {/* Hamburger — mobile only */}
      {isMobile && (
        <button style={s.hamburger} onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
          {open ? '✕' : '☰'}
        </button>
      )}

      {/* Backdrop */}
      {isMobile && open && (
        <div style={s.backdrop} onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      {sidebarVisible && (
        <aside style={{ ...s.sidebar, ...(isMobile ? s.sidebarMobile : {}) }}>
          {/* Logo row */}
          <div style={s.logoRow}>
            <div style={s.logoImgWrap}>
              <img
                src={LOGO_URL}
                alt="GESA"
                style={s.logoImg}
                onError={e => { e.target.style.display = 'none' }}
              />
              {/* Fallback text if image fails */}
              <span style={s.logoFallback}>GE<span style={{color:'#e8b82a'}}>SA</span></span>
            </div>
            <div>
              <div style={s.logoTitle}>GESA Admin</div>
              <div style={s.logoSub}>UMaT · Essikado</div>
            </div>
            {isMobile && (
              <button style={s.closeBtn} onClick={() => setOpen(false)}>✕</button>
            )}
          </div>

          {/* Nav */}
          <nav style={s.nav}>
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={handleNavClick}
                style={({ isActive }) => ({ ...s.link, ...(isActive ? s.linkActive : {}) })}
              >
                <span style={s.linkIcon}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Logout */}
          <button style={s.logout} onClick={onLogout}>
            🚪 Log out
          </button>
        </aside>
      )}
    </>
  )
}

const s = {
  sidebar: {
    width: 220,
    minHeight: '100vh',
    background: 'rgba(15,12,34,0.35)',
    backdropFilter: 'blur(32px) saturate(180%)',
    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
    borderRight: '1px solid rgba(255,255,255,0.12)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 12px',
    flexShrink: 0,
    zIndex: 100,
  },
  sidebarMobile: {
    position: 'fixed',
    top: 0, left: 0,
    height: '100vh',
    zIndex: 200,
    boxShadow: '4px 0 32px rgba(0,0,0,0.5)',
  },
  hamburger: {
    position: 'fixed',
    top: 16, left: 16,
    zIndex: 300,
    width: 40, height: 40,
    borderRadius: 10,
    background: 'rgba(23,19,46,0.9)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(212,160,23,0.3)',
    color: '#e8b82a',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 150,
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'none',
    color: '#9b8ec0',
    fontSize: 16,
    cursor: 'pointer',
    padding: 4,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 8px 20px',
    borderBottom: '1px solid rgba(180,130,255,0.13)',
    marginBottom: 14,
    position: 'relative',
  },
  logoImgWrap: {
    width: 36, height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    border: '2px solid rgba(212,160,23,0.4)',
    backgroundColor: '#5b21b6',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    position: 'absolute',
    top: 0, left: 0,
  },
  logoFallback: {
    fontSize: 11,
    fontWeight: 800,
    color: '#fff',
    zIndex: 1,
  },
  logoTitle: { fontSize: 13, fontWeight: 700, color: '#f0ecff' },
  logoSub:   { fontSize: 10, color: '#584f7a', marginTop: 1 },
  nav:  { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' },
  link: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 10,
    fontSize: 13, color: '#9b8ec0',
    transition: 'all 0.15s',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  linkActive: {
    background: 'rgba(212,160,23,0.1)',
    color: '#e8b82a',
    fontWeight: 600,
  },
  linkIcon: { fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 },
  logout: {
    marginTop: 14,
    padding: '9px 12px',
    borderRadius: 10,
    background: 'rgba(248,113,113,0.08)',
    border: '1px solid rgba(248,113,113,0.2)',
    color: '#f87171',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
  },
}
