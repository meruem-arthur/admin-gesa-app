import React, { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { getWords, addWord, addWordsBulk, deleteWord } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

// ── Date helpers ────────────────────────────────────────────────────────────
// Dates are stored as 'YYYY-MM-DD' strings, and the app compares them against
// today's UTC date, so everything here works in UTC too.
const pad      = n => String(n).padStart(2, '0')
const toStr    = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const parseStr = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
const addDays  = (s, n) => { const d = parseStr(s); d.setUTCDate(d.getUTCDate() + n); return toStr(d) }
const isDate   = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && toStr(parseStr(s)) === s
const isWeekend = s => [0, 6].includes(parseStr(s).getUTCDay())
const nice     = s => parseStr(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

const EMPTY = { word: '', type: '', definition: '', example: '', date: '' }

// One word per line: Word | Type | Definition | Example  (type and example optional).
// Lines pasted from Excel / Google Sheets (tab-separated) work too.
function parseBulk(text) {
  const rows = []
  const errors = []
  text.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return
    const cells = (raw.includes('\t') ? raw.split('\t') : raw.split('|')).map(c => c.trim())
    if (i === 0 && /^word$/i.test(cells[0]) && /^definition$/i.test(cells[2] || '')) return // header row
    const [word, type, definition, example] = [cells[0], cells[1], cells[2], cells[3]]
    if (!word || !definition) { errors.push(`Line ${i + 1}: needs at least a word and a definition`); return }
    rows.push({ word, type: type || '', definition, example: example || '' })
  })
  return { rows, errors }
}

export default function WordsPage() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode]       = useState('one') // 'one' | 'many'
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [bulkText, setBulkText]   = useState('')
  const [bulkStart, setBulkStart] = useState('')
  const [skipWeekends, setSkipWeekends] = useState(false)
  const { show, Toast }       = useToast()

  const load = async () => { setLoading(true); setList(await getWords()); setLoading(false) }
  useEffect(() => { load() }, [])

  const today = toStr(new Date())
  const usedDates = useMemo(() => new Set(list.map(w => w.date)), [list])
  const latest = list.length ? list.reduce((m, w) => (w.date > m ? w.date : m), '') : ''
  // First day with no word after everything already scheduled (or today, if the queue ran out).
  const nextFree = latest && latest >= today ? addDays(latest, 1) : today

  // ── Add one word ──
  const dateValue = form.date || nextFree
  const dateTaken = usedDates.has(dateValue)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.word.trim() || !form.definition.trim()) return show('Fill the word and the definition', 'error')
    if (!isDate(dateValue)) return show('Date must look like 2026-11-14', 'error')
    if (dateTaken) return show(`${nice(dateValue)} already has a word. Pick another date.`, 'error')
    setSaving(true)
    try {
      await addWord({ ...form, word: form.word.trim(), definition: form.definition.trim(), date: dateValue })
      await load(); setForm(EMPTY)
      show(`Word added for ${nice(dateValue)}!`)
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  // ── Add many words ──
  const { rows: parsed, errors: parseErrors } = useMemo(() => parseBulk(bulkText), [bulkText])
  const startDate = bulkStart || nextFree

  const scheduled = useMemo(() => {
    if (!isDate(startDate)) return []
    let cur = startDate
    return parsed.map(r => {
      if (skipWeekends) while (isWeekend(cur)) cur = addDays(cur, 1)
      const out = { ...r, date: cur }
      cur = addDays(cur, 1)
      return out
    })
  }, [parsed, startDate, skipWeekends])

  const clashes = scheduled.filter(r => usedDates.has(r.date))

  async function handleFile(file) {
    if (!file) return
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false })
      const clean = c => String(c ?? '').replace(/[\t\r\n]+/g, ' ').trim()
      setBulkText(rows.map(r => [r[0], r[1], r[2], r[3]].map(clean).join('\t')).join('\n'))
    } catch { show('Could not read that file. Use .xlsx or .csv with columns: Word, Type, Definition, Example', 'error') }
  }

  async function handleBulkSave() {
    if (scheduled.length === 0) return show('Nothing to add yet', 'error')
    if (!isDate(startDate)) return show('Start date must look like 2026-11-14', 'error')
    if (clashes.length) return show('Some dates already have a word. Change the start date.', 'error')
    setSaving(true)
    try {
      await addWordsBulk(scheduled)
      await load()
      show(`${scheduled.length} words added, ${nice(scheduled[0].date)} to ${nice(scheduled[scheduled.length - 1].date)}!`)
      setBulkText(''); setBulkStart('')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, word) {
    if (!confirm(`Delete "${word}"?`)) return
    await deleteWord(id); await load(); show('Deleted.')
  }

  // The word students see right now: newest word dated today or earlier.
  const liveId = list.find(w => w.date <= today)?.id

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Word of the Day</h1>
      <p style={s.hint}>
        {latest && latest >= today
          ? <>Words are scheduled through <strong>{nice(latest)}</strong>. The next free day is <strong>{nice(nextFree)}</strong>.</>
          : <>No upcoming words. The next word you add will be shown <strong>today</strong>.</>}
        {' '}If a day has no word, students keep seeing the last one.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" className={`btn btn-sm ${mode === 'one' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setMode('one')}>➕ Add one word</button>
        <button type="button" className={`btn btn-sm ${mode === 'many' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setMode('many')}>📋 Add many words</button>
      </div>

      {mode === 'one' ? (
        <div className="card" style={{ marginBottom: 28 }}>
          <h2 style={s.formTitle}>➕ Add Word</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Word *</label>
                <input value={form.word} onChange={e => setForm(f => ({ ...f, word: e.target.value }))} placeholder="e.g. Triangulation" />
              </div>
              <div className="form-group">
                <label>Type</label>
                <input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="e.g. noun · Geomatics" />
              </div>
            </div>
            <div className="form-group">
              <label>Definition *</label>
              <textarea value={form.definition} onChange={e => setForm(f => ({ ...f, definition: e.target.value }))} placeholder="Full definition…" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Example Sentence</label>
                <input value={form.example} onChange={e => setForm(f => ({ ...f, example: e.target.value }))} placeholder='"The team used triangulation to map…"' />
              </div>
              <div className="form-group">
                <label>Shown on (auto-filled with the next free day)</label>
                <input type="date" value={dateValue} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                {dateTaken && <p style={s.warn}>That day already has a word. Pick another date.</p>}
              </div>
            </div>
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? <span className="spinner" /> : '📖 Add Word'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 28 }}>
          <h2 style={s.formTitle}>📋 Add Many Words</h2>
          <p style={s.hint}>
            One word per line: <code>Word | Type | Definition | Example</code>. Type and example are optional.
            You can also paste rows straight from Excel or Google Sheets, or upload a sheet with those four columns.
            Each word gets the next day automatically.
          </p>
          <div className="form-group">
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={'Triangulation | noun · Geomatics | A method of fixing a position by measuring angles from known points. | The team used triangulation to map the site.\nBenchmark | noun | A fixed reference point of known elevation.'}
              style={{ minHeight: 170, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>First word is shown on</label>
              <input type="date" value={startDate} onChange={e => setBulkStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Or upload a sheet (.xlsx / .csv)</label>
              <input type="file" accept=".xlsx,.xls,.csv" style={{ padding: '8px 12px' }}
                onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }} />
            </div>
          </div>
          <label style={s.checkRow}>
            <input type="checkbox" checked={skipWeekends} onChange={e => setSkipWeekends(e.target.checked)} style={s.checkbox} />
            <span>Skip Saturdays and Sundays</span>
          </label>

          {parseErrors.length > 0 && (
            <div style={s.errorBox}>
              {parseErrors.map(er => <div key={er}>{er}</div>)}
              <div style={{ marginTop: 4 }}>These lines will be left out.</div>
            </div>
          )}

          {scheduled.length > 0 && (
            <>
              <p style={{ ...s.hint, marginTop: 16, marginBottom: 8 }}>
                Preview: <strong>{scheduled.length}</strong> words, {nice(scheduled[0].date)} to {nice(scheduled[scheduled.length - 1].date)}
              </p>
              <div style={s.previewWrap}>
                <table>
                  <thead><tr><th>Shown on</th><th>Word</th><th>Definition</th></tr></thead>
                  <tbody>
                    {scheduled.map((r, i) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: 'nowrap', color: usedDates.has(r.date) ? 'var(--red)' : 'var(--gold2)', fontSize: 12 }}>
                          {nice(r.date)}{usedDates.has(r.date) ? ' ⚠️' : ''}
                        </td>
                        <td style={{ fontWeight: 600 }}>{r.word}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{r.definition.length > 90 ? r.definition.slice(0, 90) + '…' : r.definition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {clashes.length > 0 && <p style={s.warn}>{clashes.length} of these days already have a word. Change the start date.</p>}
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-gold" onClick={handleBulkSave} disabled={saving || scheduled.length === 0 || clashes.length > 0}>
              {saving ? <span className="spinner" /> : scheduled.length ? `📖 Add ${scheduled.length} words` : '📖 Add words'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={s.formTitle}>All Words ({list.length})</h2>
        {loading ? <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
          : list.length === 0 ? <div className="empty-state"><div className="icon">📖</div><p>No words yet</p></div>
          : list.map(w => (
            <div key={w.id} style={s.wordCard}>
              <div style={s.wordTop}>
                <div>
                  <span style={s.wordText}>{w.word}</span>
                  {w.type && <span style={s.wordType}> · {w.type}</span>}
                  {w.id === liveId && <span className="badge badge-green" style={{ marginLeft: 8 }}>Showing now</span>}
                  {w.date > today && <span className="badge badge-purple" style={{ marginLeft: 8 }}>Upcoming</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={s.wordDate}>{w.date}</span>
                  <button className="btn btn-red btn-sm" onClick={() => handleDelete(w.id, w.word)}>🗑️</button>
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
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  hint:      { color: 'var(--muted)', fontSize: 13, marginBottom: 20, maxWidth: '70ch', lineHeight: 1.6 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  warn:      { color: 'var(--red)', fontSize: 12, marginTop: 6 },
  errorBox:  { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--red)', borderRadius: 8, padding: '10px 12px', fontSize: 12, marginTop: 12 },
  previewWrap: { maxHeight: 320, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 },
  checkRow:  { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 400, fontSize: 13, color: 'var(--text)', cursor: 'pointer' },
  checkbox:  { width: 18, height: 18, flex: 'none', padding: 0, accentColor: '#e8b82a' },
  wordCard:  { background: 'var(--card2)', borderRadius: 10, padding: '14px 16px', marginBottom: 10, borderLeft: '3px solid rgba(212,160,23,0.4)' },
  wordTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' },
  wordText:  { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  wordType:  { fontSize: 12, color: 'var(--gold2)', fontStyle: 'italic' },
  wordDate:  { fontSize: 11, color: 'var(--dim)', background: 'var(--card)', padding: '3px 8px', borderRadius: 999 },
  wordDef:   { color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 },
  wordEx:    { color: 'var(--dim)', fontSize: 12, fontStyle: 'italic', marginTop: 6, paddingLeft: 10, borderLeft: '2px solid rgba(212,160,23,0.3)' },
}
