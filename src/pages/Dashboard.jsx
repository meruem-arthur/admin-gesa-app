import React, { useEffect, useState } from 'react'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../firebase'

const STATS = [
  { label: 'Executives',    col: 'executives',       icon: '🎖️', color: '#e8b82a' },
  { label: 'Lecturers',     col: 'lecturers',         icon: '🎓', color: '#a855f7' },
  { label: 'Events',        col: 'events',            icon: '📅', color: '#60a5fa' },
  { label: 'Announcements', col: 'announcements',     icon: '📢', color: '#4ade80' },
  { label: 'Materials',     col: 'learningMaterials', icon: '📚', color: '#f59e0b' },
  { label: 'Past Questions',col: 'pastQuestions',     icon: '📄', color: '#f87171' },
  { label: 'Exams',         col: 'exams',             icon: '⏰', color: '#c084fc' },
  { label: 'Forum Posts',   col: 'forum',             icon: '💬', color: '#4ade80' },
]

export default function Dashboard() {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const results = await Promise.all(
        STATS.map(async s => {
          const snap = await getDocs(collection(db, s.col))
          return [s.col, snap.size]
        })
      )
      setCounts(Object.fromEntries(results))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Dashboard</h1>
          <p style={s.sub}>Overview of all GESA content</p>
        </div>
        <div style={s.badge}>
          <span>🟢</span> Live — connected to Firestore
        </div>
      </div>

      <div style={s.grid}>
        {STATS.map(stat => (
          <div key={stat.col} style={s.card}>
            <div style={{ ...s.iconBox, background: stat.color + '20' }}>
              <span style={s.icon}>{stat.icon}</span>
            </div>
            <div style={{ ...s.count, color: stat.color }}>
              {loading ? '—' : counts[stat.col] ?? 0}
            </div>
            <div style={s.label}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={s.infoCard}>
        <h3 style={s.infoTitle}>🛡️ Admin Notes</h3>
        <ul style={s.infoList}>
          <li>All changes here reflect instantly in the GESA mobile app</li>
          <li>Upload PDFs via Materials or Past Questions — they go to Cloudinary automatically</li>
          <li>Push notifications reach all students who have opened the app</li>
          <li>Exam dates added here appear on the live countdown in the app</li>
        </ul>
      </div>
    </div>
  )
}

const s = {
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title:     { fontSize: 24, fontWeight: 800, color: 'var(--text)' },
  sub:       { fontSize: 13, color: 'var(--muted)', marginTop: 4 },
  badge:     { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 999, padding: '6px 14px', fontSize: 12, color: 'var(--green)' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 },
  card:      { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 16px', textAlign: 'center' },
  iconBox:   { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  icon:      { fontSize: 22 },
  count:     { fontSize: 32, fontWeight: 800 },
  label:     { fontSize: 12, color: 'var(--muted)', marginTop: 4 },
  infoCard:  { background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 16, padding: '20px 24px' },
  infoTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 12 },
  infoList:  { paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--muted)', fontSize: 13 },
}
