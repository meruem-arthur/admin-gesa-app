import React from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',             icon: '📊', label: 'Dashboard'     },
  { to: '/executives',   icon: '🎖️', label: 'Executives'    },
  { to: '/lecturers',    icon: '🎓', label: 'Lecturers'     },
  { to: '/events',       icon: '📅', label: 'Events'        },
  { to: '/announcements',icon: '📢', label: 'Announcements' },
  { to: '/words',        icon: '📖', label: 'Word of Day'   },
  { to: '/materials',    icon: '📚', label: 'Materials'     },
  { to: '/pastquestions',icon: '📄', label: 'Past Questions'},
  { to: '/exams',        icon: '⏰', label: 'Exams'         },
  { to: '/notifications',icon: '🔔', label: 'Notifications' },
]

export default function Sidebar({ onLogout }) {
  return (
    <aside style={s.sidebar}>
      {/* Logo */}
      <div style={s.logo}>
        <div style={s.logoIcon}>GE<span style={{ color: '#e8b82a' }}>SA</span></div>
        <div>
          <div style={s.logoTitle}>GESA Admin</div>
          <div style={s.logoSub}>UMaT · Essikado</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
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
  )
}

const s = {
  sidebar: {
    width: 220,
    minHeight: '100vh',
    background: '#0f0c22',
    borderRight: '1px solid rgba(180,130,255,0.13)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 12px',
    flexShrink: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 8px 24px',
    borderBottom: '1px solid rgba(180,130,255,0.13)',
    marginBottom: 16,
  },
  logoIcon: {
    width: 40, height: 40,
    background: '#5b21b6',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14, fontWeight: 800, color: '#fff',
    border: '1px solid rgba(212,160,23,0.3)',
    flexShrink: 0,
  },
  logoTitle: { fontSize: 14, fontWeight: 700, color: '#f0ecff' },
  logoSub:   { fontSize: 11, color: '#584f7a', marginTop: 1 },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  link: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 10,
    fontSize: 13, color: '#9b8ec0',
    transition: 'all 0.15s',
    textDecoration: 'none',
  },
  linkActive: {
    background: 'rgba(212,160,23,0.1)',
    color: '#e8b82a',
    fontWeight: 600,
  },
  linkIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  logout: {
    marginTop: 16,
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
