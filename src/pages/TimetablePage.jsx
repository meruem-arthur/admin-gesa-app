import React, { useState, useEffect } from 'react'
import {
  collection, getDocs, addDoc, deleteDoc,
  doc, writeBatch, Timestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useToast } from '../hooks/useToast.jsx'

// ── Course code → level mapping ────────────────────────────────────────────────
function getLevel(text) {
  const t = text.toUpperCase().trim()
  if (/RT\s*132/.test(t)) return 200
  if (/RT\s*134/.test(t)) return 300
  if (/RT\s*136/.test(t)) return 400
  let m = t.match(/(?<![A-Z])GM\s*(?:\/[A-Z]+\s*)*(\d)/)
  if (m) return parseInt(m[1]) * 100
  m = t.match(/[A-Z]+\/GM\s*(\d)/)
  if (m) return parseInt(m[1]) * 100
  return null
}

function isGM(val) {
  if (!val) return false
  const t = String(val).toUpperCase().trim()
  return /(?<![A-Z])GM(?![A-Z])/.test(t) ||
         /[A-Z]+\/GM\s*\d/.test(t) ||
         /RT\s*1[3-4]\d.*GM/.test(t)
}

function extractCode(raw) {
  const t = raw.toUpperCase().trim()
  const rt = t.match(/RT\s*1\d{2}/)
  if (rt && t.includes('GM')) return rt[0].replace(/\s+/, ' ').trim()
  const m = t.match(/([A-Z]{2,3}(?:\/[A-Z]{2,3})*)\s+(\d{3})/)
  if (m) return `${m[1]} ${m[2]}`
  return t.slice(0, 20).trim()
}

// ── Parse course list CSV ──────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n')
  const courses = {}
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < 2) continue
    const code = parts[0].trim().toUpperCase()
    const name = parts.slice(1).join(',').trim().replace(/^"|"$/g, '')
    if (code && name && code !== 'CODE') courses[code] = name
  }
  return courses
}

// ── Parse timetable Excel using SheetJS ───────────────────────────────────────
async function parseTimetableExcel(file, courseMap, semesterNum) {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const wb   = XLSX.read(data, { type: 'array' })

  const TIME_COLS = {
    2: '6:30-7:30',   3: '7:30-8:30',   4: '8:30-9:30',
    5: '9:30-10:30',  6: '10:30-11:30', 7: '11:30-12:30',
    8: 'BREAK',
    9: '1:00-2:00',   10: '2:00-3:00',  11: '3:00-4:00',
    12: '4:00-5:00',  13: '5:00-6:00',  14: '6:00-7:00',
    15: '6:30-7:30pm',16: '7:30-8:30pm',
  }

  const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
  const slots = []

  for (const day of DAYS) {
    if (!wb.SheetNames.includes(day)) continue
    const ws = wb.Sheets[day]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

    // Build merge map from !merges
    const mergeMap = {}
    const merges = ws['!merges'] || []
    for (const merge of merges) {
      const topLeftCell = ws[XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c })]
      const val  = topLeftCell ? topLeftCell.v : null
      const span = merge.e.c - merge.s.c + 1
      for (let r = merge.s.r; r <= merge.e.r; r++) {
        for (let c = merge.s.c; c <= merge.e.c; c++) {
          mergeMap[`${r},${c}`] = {
            value:    val,
            span:     span,
            isStart:  r === merge.s.r && c === merge.s.c,
          }
        }
      }
    }

    const seen = new Set()

    for (let rowIdx = 8; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx]
      if (!row || !row[0]) continue
      const venue = String(row[0]).trim()
      if (venue.length < 2) continue

      for (const [colIdxStr, timeLabel] of Object.entries(TIME_COLS)) {
        const colIdx = parseInt(colIdxStr)
        if (timeLabel === 'BREAK') continue

        const cellKey = `${rowIdx},${colIdx - 1}`
        let val, span, isStart

        if (mergeMap[cellKey]) {
          val     = mergeMap[cellKey].value
          span    = mergeMap[cellKey].span
          isStart = mergeMap[cellKey].isStart
        } else {
          val     = row[colIdx - 1]
          span    = 1
          isStart = true
        }

        if (!val || !String(val).trim()) continue
        const valStr = String(val).trim()
        if (valStr.toUpperCase().includes('BREAK')) continue
        if (!isGM(valStr)) continue
        if (!isStart) continue

        const dk = `${day}|${venue}|${colIdx}|${valStr.slice(0, 25)}`
        if (seen.has(dk)) continue
        seen.add(dk)

        // Time with span
        let timeStr = timeLabel
        if (span > 1) {
          const endCol  = colIdx + span - 1
          const endTime = TIME_COLS[endCol] || timeLabel
          timeStr = `${timeLabel} – ${endTime}`
        }

        const code  = extractCode(valStr)
        const level = getLevel(valStr)

        // Look up course name from CSV map
        // Try exact match, then without spaces
        const name =
          courseMap[code] ||
          courseMap[code.replace(/\s+/g, '')] ||
          courseMap[code.replace(/\s+/g, ' ')] ||
          ''

        // Extract lecturer (text after course code digits)
        const lecMatch = valStr.match(/\d{3}[^A-Z\d]*([A-Za-z].*)/i)
        const lecturer = lecMatch ? lecMatch[1].trim().slice(0, 50) : ''

        slots.push({
          day,
          time:     timeStr,
          code,
          name,
          venue,
          level,
          lecturer,
          semester: semesterNum,
          uploadedAt: Timestamp.now(),
        })
      }
    }
  }

  return slots
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const [courseMap,    setCourseMap]    = useState({})
  const [csvFile,      setCsvFile]      = useState(null)
  const [xlsxFile,     setXlsxFile]    = useState(null)
  const [semester,     setSemester]     = useState(2)
  const [csvLoading,   setCsvLoading]   = useState(false)
  const [xlsxLoading,  setXlsxLoading] = useState(false)
  const [preview,      setPreview]      = useState([])
  const [existing,     setExisting]     = useState([])
  const [loadingExist, setLoadingExist] = useState(true)
  const { show, Toast } = useToast()

  // Load existing slots summary
  useEffect(() => { loadExisting() }, [])

  async function loadExisting() {
    setLoadingExist(true)
    try {
      const snap = await getDocs(collection(db, 'timetable'))
      setExisting(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } finally { setLoadingExist(false) }
  }

  // ── Step 1: Upload course list CSV ──────────────────────────────────────────
  async function handleCSVUpload() {
    if (!csvFile) return show('Pick a CSV file first', 'error')
    setCsvLoading(true)
    try {
      const text = await csvFile.text()
      const map  = parseCSV(text)
      const count = Object.keys(map).length
      if (count === 0) { show('No valid courses found in CSV — check format', 'error'); return }

      // Save to Firestore courseCodes collection
      const batch = writeBatch(db)
      // Clear existing first
      const existing = await getDocs(collection(db, 'courseCodes'))
      existing.docs.forEach(d => batch.delete(d.ref))
      // Add new
      for (const [code, name] of Object.entries(map)) {
        const ref = doc(collection(db, 'courseCodes'))
        batch.set(ref, { code, name })
      }
      await batch.commit()
      setCourseMap(map)
      show(`✅ ${count} courses saved!`)
    } catch (e) { show(e.message, 'error') }
    finally { setCsvLoading(false) }
  }

  // ── Step 2: Parse Excel and preview ─────────────────────────────────────────
  async function handleXLSXParse() {
    if (!xlsxFile) return show('Pick the timetable Excel file first', 'error')
    setXlsxLoading(true)
    try {
      // Load course map from Firestore if not in state
      let map = courseMap
      if (Object.keys(map).length === 0) {
        const snap = await getDocs(collection(db, 'courseCodes'))
        snap.docs.forEach(d => { const { code, name } = d.data(); map[code] = name })
        setCourseMap(map)
      }
      const slots = await parseTimetableExcel(xlsxFile, map, semester)
      if (slots.length === 0) { show('No GM courses found in file', 'error'); return }
      setPreview(slots)
      show(`Found ${slots.length} GM slots — review below then click Upload`)
    } catch (e) { show(e.message, 'error') }
    finally { setXlsxLoading(false) }
  }

  // ── Step 3: Upload parsed slots to Firestore ─────────────────────────────────
  async function handleUploadToFirestore() {
    if (preview.length === 0) return show('No slots to upload', 'error')
    if (!confirm(`This will DELETE all existing timetable data for Semester ${semester} and replace it with ${preview.length} new slots. Continue?`)) return
    setXlsxLoading(true)
    try {
      const batch = writeBatch(db)
      // Delete existing for this semester
      const snap = await getDocs(
        query(collection(db, 'timetable'))
      )
      snap.docs
        .filter(d => d.data().semester === semester)
        .forEach(d => batch.delete(d.ref))
      await batch.commit()

      // Upload in batches of 400 (Firestore limit is 500)
      const chunks = []
      for (let i = 0; i < preview.length; i += 400) chunks.push(preview.slice(i, i + 400))
      for (const chunk of chunks) {
        const b = writeBatch(db)
        chunk.forEach(slot => b.set(doc(collection(db, 'timetable')), slot))
        await b.commit()
      }

      show(`✅ ${preview.length} slots uploaded to Firestore!`)
      setPreview([])
      await loadExisting()
    } catch (e) { show(e.message, 'error') }
    finally { setXlsxLoading(false) }
  }

  async function handleClearSemester() {
    if (!confirm(`Delete ALL timetable data for Semester ${semester}?`)) return
    const snap = await getDocs(collection(db, 'timetable'))
    const toDelete = snap.docs.filter(d => d.data().semester === semester)
    const batch = writeBatch(db)
    toDelete.forEach(d => batch.delete(d.ref))
    await batch.commit()
    show(`Cleared Semester ${semester} timetable`)
    await loadExisting()
  }

  // Summary of existing
  const existBySemLevel = {}
  existing.forEach(s => {
    const key = `Sem ${s.semester} · Level ${s.level}`
    existBySemLevel[key] = (existBySemLevel[key] || 0) + 1
  })

  // Preview grouped by level
  const previewByLevel = {}
  preview.forEach(s => {
    const k = `Level ${s.level || 'Unknown'}`
    previewByLevel[k] = (previewByLevel[k] || 0) + 1
  })

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Timetable Manager</h1>
      <p style={s.sub}>Upload the GM timetable so students can view it in the app.</p>

      {/* ── Current timetable status ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={s.sectionTitle}>📊 Current Timetable in Firestore</h2>
        {loadingExist
          ? <div style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /></div>
          : Object.keys(existBySemLevel).length === 0
            ? <div className="empty-state"><div className="icon">📅</div><p>No timetable uploaded yet</p></div>
            : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                {Object.entries(existBySemLevel).sort().map(([key, count]) => (
                  <div key={key} style={s.statChip}>
                    <span style={s.statNum}>{count}</span>
                    <span style={s.statLbl}>{key}</span>
                  </div>
                ))}
              </div>
            )
        }
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Semester to clear</label>
            <div className="chip-group">
              {[1, 2].map(s => (
                <span key={s} className={`chip${semester === s ? ' active' : ''}`} onClick={() => setSemester(s)}>Sem {s}</span>
              ))}
            </div>
          </div>
          <button className="btn btn-red btn-sm" style={{ marginTop: 18 }} onClick={handleClearSemester}>
            🗑️ Clear Sem {semester}
          </button>
        </div>
      </div>

      {/* ── Step 1: Course List CSV ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={s.sectionTitle}>Step 1 — Upload Course List CSV</h2>
        <p style={s.stepDesc}>
          A CSV with two columns: <code style={s.code}>Code, Name</code><br />
          Example: <code style={s.code}>GM 372, Remote Sensing and Image Processing</code><br />
          Include ALL GM courses (100–400 level). Upload once, reuse for all semesters.
        </p>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label>CSV File</label>
          <input
            type="file" accept=".csv"
            onChange={e => setCsvFile(e.target.files[0])}
            style={{ padding: '8px 12px' }}
          />
          {csvFile && <p style={{ fontSize: 12, color: 'var(--gold2)', marginTop: 4 }}>📄 {csvFile.name}</p>}
        </div>
        {Object.keys(courseMap).length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--green)', marginBottom: 8 }}>
            ✅ {Object.keys(courseMap).length} courses loaded in memory
          </p>
        )}
        <button className="btn btn-gold" onClick={handleCSVUpload} disabled={csvLoading || !csvFile}>
          {csvLoading ? <span className="spinner" /> : '📤 Upload Course List'}
        </button>
      </div>

      {/* ── Step 2: Timetable Excel ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={s.sectionTitle}>Step 2 — Parse Timetable Excel</h2>
        <p style={s.stepDesc}>
          Upload the official UMaT timetable Excel file. The system will extract all GM courses automatically,
          match them to course names from your CSV, and show a preview before saving.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 12 }}>
          <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
            <label>Timetable Excel File (.xlsx)</label>
            <input
              type="file" accept=".xlsx,.xls"
              onChange={e => { setXlsxFile(e.target.files[0]); setPreview([]) }}
              style={{ padding: '8px 12px' }}
            />
            {xlsxFile && <p style={{ fontSize: 12, color: 'var(--gold2)', marginTop: 4 }}>📊 {xlsxFile.name}</p>}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Semester</label>
            <div className="chip-group" style={{ marginTop: 6 }}>
              {[1, 2].map(n => (
                <span key={n} className={`chip${semester === n ? ' active' : ''}`} onClick={() => setSemester(n)}>Sem {n}</span>
              ))}
            </div>
          </div>
        </div>
        <button className="btn btn-gold" style={{ marginTop: 12 }} onClick={handleXLSXParse} disabled={xlsxLoading || !xlsxFile}>
          {xlsxLoading ? <span className="spinner" /> : '🔍 Parse Timetable'}
        </button>
      </div>

      {/* ── Preview ── */}
      {preview.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={s.sectionTitle}>Step 3 — Preview & Upload</h2>
            <button className="btn btn-gold" onClick={handleUploadToFirestore} disabled={xlsxLoading}>
              {xlsxLoading ? <span className="spinner" /> : `📤 Upload ${preview.length} Slots to Firestore`}
            </button>
          </div>

          {/* Level summary */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {Object.entries(previewByLevel).sort().map(([key, count]) => (
              <div key={key} style={{ ...s.statChip, background: 'rgba(212,160,23,0.15)', borderColor: 'rgba(212,160,23,0.3)' }}>
                <span style={{ ...s.statNum, color: 'var(--gold2)' }}>{count}</span>
                <span style={s.statLbl}>{key}</span>
              </div>
            ))}
            <div style={{ ...s.statChip, background: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.25)' }}>
              <span style={{ ...s.statNum, color: 'var(--green)' }}>{preview.length}</span>
              <span style={s.statLbl}>Total Slots</span>
            </div>
          </div>

          {/* Preview table — first 30 rows */}
          <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>
            Showing first 30 of {preview.length} slots:
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Day</th><th>Time</th><th>Code</th><th>Name</th><th>Level</th><th>Venue</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 30).map((slot, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--gold3)', fontWeight: 600 }}>{slot.day}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{slot.time}</td>
                    <td style={{ fontWeight: 700, color: 'var(--gold2)' }}>{slot.code}</td>
                    <td style={{ fontSize: 12 }}>{slot.name || <span style={{ color: 'var(--dim)' }}>— no name —</span>}</td>
                    <td><span className="badge badge-purple">L{slot.level || '?'}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{slot.venue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Warn about missing names */}
          {preview.filter(p => !p.name).length > 0 && (
            <div style={s.warnBox}>
              ⚠️ {preview.filter(p => !p.name).length} courses have no name match.
              Upload a more complete course list CSV, or the codes will show without names in the app.
            </div>
          )}
        </div>
      )}

      {/* ── CSV Format Guide ── */}
      <div className="card">
        <h2 style={s.sectionTitle}>📋 CSV Format Guide</h2>
        <p style={s.stepDesc}>Create a plain .csv file with this format — no headers needed, or use "Code,Name" as header:</p>
        <pre style={s.pre}>{`GM 152, Survey Computations I
GM 154, Photogrammetry I
GM 156, Engineering Mathematics II
GM 158, Technical Drawing
GM 172, Communication Skills
GM 252, Survey Computations II
GM 254, Photogrammetry II
GM 256, Engineering Mathematics III
GM 352, Remote Sensing
GM 354, Geographic Information Systems
GM 372, Geodesy
GM 452, Digital Photogrammetry
GM 472, Land Use Planning
RT 132, Physical Education II
RT 134, Physical Education III
RT 136, Physical Education IV`}</pre>
        <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 8 }}>
          For combined courses like CE/GM 354, include the GM code only: <code style={s.code}>GM 354, GIS Applications</code>
        </p>
      </div>
    </div>
  )
}

const s = {
  title:       { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 },
  sub:         { fontSize: 13, color: 'var(--muted)', marginBottom: 24 },
  sectionTitle:{ fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 8 },
  stepDesc:    { fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 },
  code:        { background: 'rgba(212,160,23,0.1)', borderRadius: 4, padding: '1px 6px', fontSize: 12, color: 'var(--gold3)', fontFamily: 'monospace' },
  pre:         { background: 'var(--card2)', borderRadius: 8, padding: 16, fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace', overflowX: 'auto', marginTop: 8, lineHeight: 1.8, border: '1px solid var(--border)' },
  statChip:    { background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 100 },
  statNum:     { display: 'block', fontSize: 22, fontWeight: 800, color: 'var(--purple2)' },
  statLbl:     { display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2 },
  warnBox:     { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--amber)', marginTop: 12 },
}
