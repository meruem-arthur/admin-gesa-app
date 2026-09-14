import React, { useEffect, useState } from 'react'
import {
  collection, getDocs, doc, writeBatch, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { getExams, addExam, deleteExam } from '../hooks/useFirestore'
import { useToast } from '../hooks/useToast'

const EMPTY  = { title: '', startDate: '', endDate: '', note: '' }

function fmtDate(val) {
  if (!val) return ''
  const d = val.toDate ? val.toDate() : new Date(val)
  return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function daysLeft(val) {
  if (!val) return null
  const d = val.toDate ? val.toDate() : new Date(val)
  return Math.ceil((d - new Date()) / 86400000)
}

// ── "GM I" / "GM II" / "GM III" / "GM IV" → 100 / 200 / 300 / 400 ─────────────
// The CLASS column in the UMaT exams sheet already tags every row a GM
// student sits (including shared/compulsory courses like RT 132/134/136)
// with the GM class directly, so we don't need the code-guessing logic the
// class-timetable parser needs — just read the CLASS column.
const CLASS_LEVEL = { I: 100, II: 200, III: 300, IV: 400 }
function classToLevel(classVal) {
  const m = String(classVal || '').toUpperCase().trim().match(/^GM\s*(I{1,3}|IV)$/)
  return m ? CLASS_LEVEL[m[1]] : null
}

const SESSION_LABEL = { M: 'Morning', A: 'Afternoon', E: 'Evening' }

// ── Find the header row in a sheet by looking for DATE / CRS NO / CLASS ──────
// (works across sheets even when the exact wording differs slightly, e.g.
// "COURSE NAME" vs "COURSE TITLE", "MORN/AFT" vs "MORN/NOON")
function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = (rows[i] || []).map(c => (c ?? '').toString().toUpperCase().trim())
    const dateIdx = row.indexOf('DATE')
    const classIdx = row.indexOf('CLASS')
    const crsIdx = row.findIndex(c => c.startsWith('CRS'))
    if (dateIdx !== -1 && classIdx !== -1 && crsIdx !== -1) {
      return {
        rowIdx: i,
        date: dateIdx,
        code: crsIdx,
        name: row.findIndex(c => c.startsWith('COURSE')),
        class: classIdx,
        no: row.findIndex(c => c.replace('.', '') === 'NO'),
        examiner: row.findIndex(c => c.startsWith('EXAMINER')),
        room: row.findIndex(c => c.startsWith('ROOM')),
        invigilator: row.findIndex(c => c.startsWith('INVIGILATOR')),
        session: row.findIndex(c => c.startsWith('MORN')),
      }
    }
  }
  return null
}

function toDateSafe(val) {
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    // Fallback in case a cell didn't come through as a real Date (Excel's
    // day-zero is Dec 30 1899)
    const epoch = new Date(Date.UTC(1899, 11, 30))
    return new Date(epoch.getTime() + val * 86400000)
  }
  const d = new Date(val)
  return isNaN(d) ? null : d
}

// ── Parse the university exams Excel, keep only GM (Geomatic Eng.) rows ──────
async function parseExamsExcel(file) {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array', cellDates: true })

  const slots = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
    const h = findHeader(rows)
    if (!h) continue // sheet doesn't look like an exams table — skip it

    for (let r = h.rowIdx + 1; r < rows.length; r++) {
      const row = rows[r]
      if (!row) continue

      const level = classToLevel(row[h.class])
      if (!level) continue // not a GM row

      const dateVal = toDateSafe(row[h.date])
      const code = row[h.code] ? String(row[h.code]).trim() : ''
      if (!dateVal || !code) continue

      const sessionRaw = h.session !== -1 ? String(row[h.session] || '').trim().toUpperCase() : ''

      slots.push({
        date: Timestamp.fromDate(dateVal),
        code,
        name: h.name !== -1 && row[h.name] ? String(row[h.name]).trim() : '',
        className: String(row[h.class]).trim(),
        level,
        examNumber: h.no !== -1 && row[h.no] ? String(row[h.no]).trim() : '',
        examiner: h.examiner !== -1 && row[h.examiner] ? String(row[h.examiner]).trim() : '',
        room: h.room !== -1 && row[h.room] ? String(row[h.room]).trim() : '',
        invigilator: h.invigilator !== -1 && row[h.invigilator] ? String(row[h.invigilator]).trim() : '',
        session: sessionRaw,
        sessionLabel: SESSION_LABEL[sessionRaw] || sessionRaw,
        uploadedAt: Timestamp.now(),
      })
    }
  }
  return slots
}

async function batchDelete(docs) {
  for (let i = 0; i < docs.length; i += 400) {
    const chunk = docs.slice(i, i + 400)
    const b = writeBatch(db)
    chunk.forEach(d => b.delete(d.ref))
    await b.commit()
  }
}

async function batchSet(items, col) {
  for (let i = 0; i < items.length; i += 400) {
    const chunk = items.slice(i, i + 400)
    const b = writeBatch(db)
    chunk.forEach(item => b.set(doc(collection(db, col)), item))
    await b.commit()
  }
}

export default function ExamsPage() {
  const [list, setList]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const { show, Toast }     = useToast()

  const load = async () => { setLoading(true); setList(await getExams()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.startDate) return show('Fill title and start date', 'error')
    setSaving(true)
    try {
      await addExam(form); await load(); setForm(EMPTY)
      show('Exam added!')
    } catch (err) { show(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, title) {
    if (!confirm(`Delete "${title}" exam?`)) return
    await deleteExam(id); await load()
    show('Deleted.')
  }

  const now      = new Date()
  const upcoming = list.filter(e => (e.startDate?.toDate ? e.startDate.toDate() : new Date(e.startDate)) >= now)
  const past     = list.filter(e => (e.startDate?.toDate ? e.startDate.toDate() : new Date(e.startDate)) < now)

  function urgencyColor(days) {
    if (days === null) return 'var(--dim)'
    if (days < 0)  return 'var(--dim)'
    if (days === 0) return 'var(--red)'
    if (days <= 3)  return '#f87171'
    if (days <= 7)  return 'var(--amber)'
    return 'var(--green)'
  }

  // ── Exams Timetable (per-level, uploaded from the university Excel) ─────────
  const [ttFile,         setTtFile]         = useState(null)
  const [ttLoading,      setTtLoading]      = useState(false)
  const [ttPreview,      setTtPreview]      = useState([])
  const [ttExisting,     setTtExisting]     = useState([])
  const [ttLoadingExist, setTtLoadingExist] = useState(true)

  useEffect(() => { loadTimetableExisting() }, [])

  async function loadTimetableExisting() {
    setTtLoadingExist(true)
    try {
      const snap = await getDocs(collection(db, 'examsTimetable'))
      setTtExisting(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } finally { setTtLoadingExist(false) }
  }

  async function handleParseExamsExcel() {
    if (!ttFile) return show('Pick the exams timetable Excel file first', 'error')
    setTtLoading(true)
    try {
      const slots = await parseExamsExcel(ttFile)
      if (slots.length === 0) { show('No GM exam rows found in file', 'error'); return }
      setTtPreview(slots)
      show(`Found ${slots.length} GM exam slots — review below then click Upload`)
    } catch (e) { show(e.message, 'error') }
    finally { setTtLoading(false) }
  }

  async function handleUploadExamsTimetable() {
    if (ttPreview.length === 0) return show('No slots to upload', 'error')
    if (!confirm(`This will DELETE the current exams timetable (all levels) and replace it with ${ttPreview.length} new slots. Continue?`)) return
    setTtLoading(true)
    try {
      const snap = await getDocs(collection(db, 'examsTimetable'))
      await batchDelete(snap.docs)
      await batchSet(ttPreview, 'examsTimetable')
      show(`✅ ${ttPreview.length} exam slots uploaded!`)
      setTtPreview([]); setTtFile(null)
      await loadTimetableExisting()
    } catch (e) { show(e.message, 'error') }
    finally { setTtLoading(false) }
  }

  async function handleClearExamsTimetable() {
    if (!confirm('Delete the ENTIRE exams timetable, for all levels?')) return
    const snap = await getDocs(collection(db, 'examsTimetable'))
    await batchDelete(snap.docs)
    show('Exams timetable cleared')
    await loadTimetableExisting()
  }

  const ttExistByLevel = {}
  ttExisting.forEach(s => { ttExistByLevel[`Level ${s.level}`] = (ttExistByLevel[`Level ${s.level}`] || 0) + 1 })

  const ttPreviewByLevel = {}
  ttPreview.forEach(s => { ttPreviewByLevel[`Level ${s.level}`] = (ttPreviewByLevel[`Level ${s.level}`] || 0) + 1 })

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Exam Countdown</h1>
      <p style={s.sub}>Exam dates added here appear as live countdowns in the student app.</p>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Add Exam</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Second Semester Examinations" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date & Time * (YYYY-MM-DDTHH:MM)</label>
              <input type="datetime-local" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} />
            </div>
            <div className="form-group">
              <label>End Date & Time (optional)</label>
              <input type="datetime-local" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} />
            </div>
          </div>
          <div className="form-group">
            <label>Note (optional)</label>
            <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="e.g. Bring your student ID" />
          </div>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner"/> : '⏰ Add Exam'}
          </button>
        </form>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <h2 style={s.formTitle}>Upcoming Exams ({upcoming.length})</h2>
        {loading ? <div style={{textAlign:'center',padding:32}}><span className="spinner"/></div>
          : upcoming.length===0 ? <div className="empty-state"><div className="icon">⏰</div><p>No upcoming exams</p></div>
          : (
            <table>
              <thead><tr><th>Title</th><th>Start Date</th><th>End Date</th><th>Countdown</th><th>Actions</th></tr></thead>
              <tbody>
                {upcoming.map(ex=>{
                  const days = daysLeft(ex.startDate)
                  const col  = urgencyColor(days)
                  return (
                    <tr key={ex.id}>
                      <td style={{fontWeight:700,color:'var(--gold3)'}}>{ex.title}</td>
                      <td style={{color:'var(--gold2)',fontSize:12}}>{fmtDate(ex.startDate)}</td>
                      <td style={{color:'var(--muted)',fontSize:12}}>{ex.endDate ? fmtDate(ex.endDate) : '—'}</td>
                      <td style={{color:col,fontWeight:700}}>
                        {days === 0 ? 'TODAY!' : days === 1 ? '1 day' : `${days} days`}
                      </td>
                      <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(ex.id,ex.title)}>🗑️</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      {past.length > 0 && (
        <div className="card" style={{opacity:0.55, marginBottom: 28}}>
          <h2 style={s.formTitle}>Past Exams ({past.length})</h2>
          <table>
            <thead><tr><th>Title</th><th>Start Date</th><th>Actions</th></tr></thead>
            <tbody>
              {past.map(ex=>(
                <tr key={ex.id}>
                  <td style={{color:'var(--dim)'}}>{ex.title}</td>
                  <td style={{color:'var(--dim)',fontSize:12}}>{fmtDate(ex.startDate)}</td>
                  <td><button className="btn btn-red btn-sm" onClick={()=>handleDelete(ex.id,ex.title)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Exams Timetable ─────────────────────────────────────────────────── */}
      <h1 style={{ ...s.title, marginTop: 8 }}>Exams Timetable</h1>
      <p style={s.sub}>
        Upload the official UMaT exams Excel. Only GM (Geomatic Engineering) rows are kept —
        students see their level's slots in the app, grouped under the countdown above.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={s.formTitle}>📊 Current Exams Timetable in Firestore</h2>
          {ttExisting.length > 0 && (
            <button className="btn btn-red btn-sm" onClick={handleClearExamsTimetable}>🗑️ Clear All</button>
          )}
        </div>
        {ttLoadingExist
          ? <div style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /></div>
          : Object.keys(ttExistByLevel).length === 0
            ? <div className="empty-state"><div className="icon">📄</div><p>No exams timetable uploaded yet</p></div>
            : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {Object.entries(ttExistByLevel).sort().map(([key, count]) => (
                  <div key={key} style={s.statChip}>
                    <span style={s.statNum}>{count}</span>
                    <span style={s.statLbl}>{key}</span>
                  </div>
                ))}
              </div>
            )
        }
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={s.formTitle}>Upload Exams Timetable Excel</h2>
        <p style={s.stepDesc}>
          Upload the university's exams Excel file (the one with a DATE / CRS NO / CLASS / EXAMINER layout).
          GM rows are extracted automatically — including shared courses like RT 132/134/136,
          since the sheet already tags those with the right GM class.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 12 }}>
          <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
            <label>Exams Timetable Excel File (.xlsx)</label>
            <input
              type="file" accept=".xlsx,.xls"
              onChange={e => { setTtFile(e.target.files[0]); setTtPreview([]) }}
              style={{ padding: '8px 12px' }}
            />
            {ttFile && <p style={{ fontSize: 12, color: 'var(--gold2)', marginTop: 4 }}>📊 {ttFile.name}</p>}
          </div>
        </div>
        <button className="btn btn-gold" style={{ marginTop: 12 }} onClick={handleParseExamsExcel} disabled={ttLoading || !ttFile}>
          {ttLoading ? <span className="spinner" /> : '🔍 Parse Exams Timetable'}
        </button>
      </div>

      {ttPreview.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={s.formTitle}>Preview & Upload</h2>
            <button className="btn btn-gold" onClick={handleUploadExamsTimetable} disabled={ttLoading}>
              {ttLoading ? <span className="spinner" /> : `📤 Upload ${ttPreview.length} Slots to Firestore`}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {Object.entries(ttPreviewByLevel).sort().map(([key, count]) => (
              <div key={key} style={{ ...s.statChip, background: 'rgba(212,160,23,0.15)', borderColor: 'rgba(212,160,23,0.3)' }}>
                <span style={{ ...s.statNum, color: 'var(--gold2)' }}>{count}</span>
                <span style={s.statLbl}>{key}</span>
              </div>
            ))}
            <div style={{ ...s.statChip, background: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.25)' }}>
              <span style={{ ...s.statNum, color: 'var(--green)' }}>{ttPreview.length}</span>
              <span style={s.statLbl}>Total Slots</span>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>
            Showing first 30 of {ttPreview.length} slots:
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Session</th><th>Code</th><th>Course</th><th>Level</th><th>Room</th><th>Invigilator</th>
                </tr>
              </thead>
              <tbody>
                {ttPreview.slice(0, 30).map((slot, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12, color: 'var(--gold3)', whiteSpace: 'nowrap' }}>{fmtDate(slot.date)}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{slot.sessionLabel || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--gold2)' }}>{slot.code}</td>
                    <td style={{ fontSize: 12 }}>{slot.name || <span style={{ color: 'var(--dim)' }}>— no name —</span>}</td>
                    <td><span className="badge badge-purple">L{slot.level}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{slot.room}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{slot.invigilator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {ttPreview.filter(p => !p.name).length > 0 && (
            <div style={s.warnBox}>
              ⚠️ {ttPreview.filter(p => !p.name).length} rows have no course name — likely a merged cell in the
              source Excel. They'll still show a code and date in the app, just without a title.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 },
  sub:       { fontSize: 13, color: 'var(--muted)', marginBottom: 24 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  stepDesc:  { fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 },
  statChip:  { background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 100 },
  statNum:   { display: 'block', fontSize: 22, fontWeight: 800, color: 'var(--purple2)' },
  statLbl:   { display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2 },
  warnBox:   { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--amber)', marginTop: 12 },
}
