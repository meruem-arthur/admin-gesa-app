import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export default function ForumPage() {
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'forum'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Sort newest first
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setPosts(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  async function handleDelete(id) {
    if (!window.confirm('Delete this post?')) return
    await deleteDoc(doc(db, 'forum', id))
  }

  async function handleTogglePin(post) {
    await updateDoc(doc(db, 'forum', post.id), { pinned: !post.pinned })
  }

  const filtered = posts.filter(p =>
    (p.title || p.body || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.authorName || p.author || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.tag || '').toLowerCase().includes(search.toLowerCase())
  )

  function formatDate(ts) {
    if (!ts) return '—'
    return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div>
      <h1 style={s.heading}>💬 Forum Posts</h1>
      <p style={s.sub}>Student questions and discussions from the GESA app</p>

      {/* Stats + Search row */}
      <div style={s.topRow}>
        <div style={s.statBadge}>{posts.length} total posts</div>
        <input
          style={s.search}
          placeholder="Search posts or authors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading && <p style={s.empty}>Loading...</p>}
      {!loading && filtered.length === 0 && (
        <div style={s.emptyBox}>
          <p style={{ fontSize: 32, margin: 0 }}>💬</p>
          <p style={s.emptyText}>No forum posts yet</p>
          <p style={s.emptySub}>Students will see their questions here once they post in the app</p>
        </div>
      )}

      <div style={s.list}>
        {filtered.map(post => (
          <div key={post.id} style={{ ...s.card, ...(post.pinned ? s.cardPinned : {}) }}>
            {post.pinned && <span style={s.pinnedBadge}>📌 Pinned</span>}

            <div style={s.cardTop}>
              <div style={s.avatar}>
                {(post.authorName || post.author || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.author}>{post.authorName || post.author || 'Anonymous'}</div>
                <div style={s.date}>{formatDate(post.createdAt)}</div>
              </div>
              <div style={s.actions}>
                <button
                  style={{ ...s.actionBtn, color: post.pinned ? '#e8b82a' : '#9b8ec0' }}
                  onClick={() => handleTogglePin(post)}
                  title={post.pinned ? 'Unpin' : 'Pin'}
                >
                  📌
                </button>
                <button
                  style={{ ...s.actionBtn, color: '#f87171' }}
                  onClick={() => handleDelete(post.id)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            {post.tag && <span style={s.tag}>{post.tag}</span>}

            <p style={s.postText}>{post.title || '(no title)'}</p>

            {post.body && (
              <p style={s.postBody}>{post.body}</p>
            )}

            <div style={s.metaRow}>
              {post.replyCount > 0 && (
                <span style={s.replyCount}>💬 {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}</span>
              )}
              {post.likes > 0 && (
                <span style={s.likes}>❤️ {post.likes} {post.likes === 1 ? 'like' : 'likes'}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  heading: { fontSize: 24, fontWeight: 800, color: '#f0ecff', margin: 0 },
  sub:     { fontSize: 13, color: '#9b8ec0', marginTop: 4, marginBottom: 24 },
  topRow:  { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  statBadge: {
    background: 'rgba(212,160,23,0.12)',
    border: '1px solid rgba(212,160,23,0.3)',
    color: '#e8b82a',
    borderRadius: 20,
    padding: '4px 14px',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  search: {
    flex: 1,
    minWidth: 200,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: '8px 14px',
    color: '#f0ecff',
    fontSize: 13,
    outline: 'none',
  },
  list:  { display: 'flex', flexDirection: 'column', gap: 14 },
  card: {
    background: 'rgba(23,19,46,0.5)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(180,130,255,0.13)',
    borderRadius: 16,
    padding: '16px 18px',
    position: 'relative',
  },
  cardPinned: {
    border: '1px solid rgba(212,160,23,0.35)',
    background: 'rgba(212,160,23,0.06)',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 12, right: 12,
    fontSize: 11,
    color: '#e8b82a',
    background: 'rgba(212,160,23,0.12)',
    borderRadius: 8,
    padding: '2px 8px',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 36, height: 36,
    borderRadius: 18,
    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
  },
  author:   { fontSize: 13, fontWeight: 700, color: '#f0ecff' },
  date:     { fontSize: 11, color: '#584f7a', marginTop: 2 },
  actions:  { display: 'flex', gap: 6, marginLeft: 'auto' },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 8,
    transition: 'background 0.15s',
  },
  postText: { fontSize: 14, color: '#d4cfea', margin: 0, lineHeight: 1.6, fontWeight: 600 },
  postBody: { fontSize: 13, color: '#9b8ec0', marginTop: 6, lineHeight: 1.6 },
  tag: {
    display: 'inline-block',
    fontSize: 11,
    background: 'rgba(124,58,237,0.2)',
    color: '#a78bfa',
    borderRadius: 6,
    padding: '2px 8px',
    marginBottom: 8,
    fontWeight: 600,
  },
  metaRow: { display: 'flex', gap: 14, marginTop: 10 },
  replyCount: { fontSize: 12, color: '#7c6fa0' },
  likes:      { fontSize: 12, color: '#f87171' },
  empty:    { color: '#9b8ec0', textAlign: 'center', marginTop: 40 },
  emptyBox: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'rgba(23,19,46,0.4)',
    borderRadius: 16,
    border: '1px solid rgba(180,130,255,0.1)',
  },
  emptyText: { fontSize: 18, fontWeight: 700, color: '#f0ecff', margin: '12px 0 6px' },
  emptySub:  { fontSize: 13, color: '#584f7a' },
}
