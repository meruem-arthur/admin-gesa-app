import React, { useEffect, useState } from 'react'
import { getWords, addWord, deleteWord } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

const EMPTY = { word: '', type: '', definition: '', example: '', date: '' }

export default function WordsPage() {
  const [list, setList]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const { show, Toast }     = useToast()

  const load = async () => { setLoading(true); setList(await getWords()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.word || !form.definition || !form.date) return show('Fill word, definition and date', 'error')
    setSaving(true)
    try {
      await addWord(form); await load(); setForm(EMPTY)
      show('Word added!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, word) {
    if (!confirm(`Delete "${word}"?`)) return
    await deleteWord(id); await load(); show('Deleted.')
  }

  // Today's date for default
  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Word of the Day</h1>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Add Word</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Word *</label>
              <input value={form.word} onChange={e=>setForm(f=>({...f,word:e.target.value}))} placeholder="e.g. Triangulation" />
            </div>
            <div className="form-group">
              <label>Type</label>
              <input value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} placeholder="e.g. noun · Geomatics" />
            </div>
          </div>
          <div className="form-group">
            <label>Definition *</label>
            <textarea value={form.definition} onChange={e=>setForm(f=>({...f,definition:e.target.value}))} placeholder="Full definition…" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Example Sentence</label>
              <input value={form.example} onChange={e=>setForm(f=>({...f,example:e.target.value}))} placeholder='"The team used triangulation to map…"' />
            </div>
            <div className="form-group">
              <label>Date * (YYYY-MM-DD)</label>
              <input
                value={form.date}
                onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                placeholder={today}
                onFocus={e => { if(!form.date) setForm(f=>({...f,date:today})) }}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner"/> : '📖 Add Word'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={s.formTitle}>All Words ({list.length})</h2>
        {loading ? <div style={{textAlign:'center',padding:32}}><span className="spinner"/></div>
          : list.length===0 ? <div className="empty-state"><div className="icon">📖</div><p>No words yet</p></div>
          : list.map(w => (
            <div key={w.id} style={s.wordCard}>
              <div style={s.wordTop}>
                <div>
                  <span style={s.wordText}>{w.word}</span>
                  <span style={s.wordType}> · {w.type}</span>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={s.wordDate}>{w.date}</span>
                  <button className="btn btn-red btn-sm" onClick={()=>handleDelete(w.id,w.word)}>🗑️</button>
                </div>
              </div>
              <p style={s.wordDef}>{w.definition}</p>
              {w.example && <p style={s.wordEx}>"{w.example}"</p>}
            </div>
          ))}
      </div>
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  wordCard:  { background: 'var(--card2)', borderRadius: 10, padding: '14px 16px', marginBottom: 10, borderLeft: '3px solid rgba(212,160,23,0.4)' },
  wordTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  wordText:  { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  wordType:  { fontSize: 12, color: 'var(--gold2)', fontStyle: 'italic' },
  wordDate:  { fontSize: 11, color: 'var(--dim)', background: 'var(--card)', padding: '3px 8px', borderRadius: 999 },
  wordDef:   { color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 },
  wordEx:    { color: 'var(--dim)', fontSize: 12, fontStyle: 'italic', marginTop: 6, paddingLeft: 10, borderLeft: '2px solid rgba(212,160,23,0.3)' },
}
