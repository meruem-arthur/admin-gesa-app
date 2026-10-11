import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getMaterials, addMaterial, deleteMaterial } from '../hooks/useFirestore'
import { uploadFile } from '../cloudinary'
import { useToast } from '../hooks/useToast'

const LEVELS = ['100', '200', '300', '400']
const SEMS   = ['1', '2']
const EMPTY  = { level: '100', semester: '1', courseCode: '', courseName: '' }

const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'ppt', 'pptx']
const extOf = name => (String(name).split('.').pop() || '').toLowerCase()
const typeLabel = ext => (ext === 'pdf' ? 'PDF' : ext.startsWith('ppt') ? 'PPT' : ext.startsWith('doc') ? 'DOC' : ext.toUpperCase())
const normCode = c => String(c || '').toUpperCase().replace(/\s+/g, '')

// "GM175 - Introduction to Surveying.pdf" → { code: 'GM 175', name: 'Introduction to Surveying' }
// Also understands "GM 175 …", "GM-175 …", "GM175_Introduction_to_Surveying" and a bare "GM175".
function parseMaterialName(fileName) {
  const base = String(fileName).replace(/\.[^.]+$/, '')
  const m = base.match(/^\s*([A-Za-z]{2,4})[\s_-]?(\d{3})(?!\d)\s*[-_\u2013\u2014:.]*\s*(.*)$/)
  if (!m) return { code: '', name: base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() }
  return {
    code: `${m[1].toUpperCase()} ${m[2]}`,
    name: m[3].replace(/_+/g, ' ').replace(/\s+/g, ' ').trim(),
  }
}

// ── Upload a whole folder at once ───────────────────────────────────────────
// Level and semester are chosen once; each file's course code and name are read
// from its file name and can be corrected in the preview before anything uploads.
function BulkUpload({ list, reload, show }) {
  const [level, setLevel]       = useState('100')
  const [semester, setSemester] = useState('1')
  const [items, setItems]       = useState([]) // { id, file, code, name, state, error }
  const [skipped, setSkipped]   = useState(0)
  const [running, setRunning]   = useState(false)
  const folderRef = useRef(null)
  const idRef     = useRef(0)

  useEffect(() => { folderRef.current?.setAttribute('webkitdirectory', '') }, [])

  function addFiles(fileList) {
    const all = Array.from(fileList || [])
    const ok = all.filter(f => ALLOWED_EXT.includes(extOf(f.name)))
    ok.sort((a, b) => a.name.localeCompare(b.name))
    setSkipped(all.length - ok.length)
    setItems(ok.map(file => {
      const { code, name } = parseMaterialName(file.name)
      return { id: ++idRef.current, file, code, name, state: 'pending', error: '' }
    }))
  }

  const patch = (id, changes) => setItems(prev => prev.map(x => (x.id === id ? { ...x, ...changes } : x)))

  // Work out, for every file, whether it can be uploaded as it stands.
  const rows = useMemo(() => {
    const existing = new Set(
      list.filter(m => String(m.level) === level && String(m.semester) === semester)
          .map(m => `${normCode(m.courseCode)}|${typeLabel(extOf(m.fileName || ''))}`)
    )
    const seen = new Set()
    return items.map(it => {
      const key = `${normCode(it.code)}|${typeLabel(extOf(it.file.name))}`
      let problem = ''
      if (it.state !== 'done') {
        if (!it.code.trim()) problem = 'Add a course code'
        else if (existing.has(key)) problem = 'Already uploaded'
        else if (seen.has(key)) problem = 'Duplicate in this batch'
      }
      seen.add(key)
      const digit = (it.code.match(/\d/) || [])[0]
      const levelWarn = digit && String(Number(digit) * 100) !== level ? `Looks like a Level ${Number(digit) * 100} course` : ''
      return { ...it, problem, levelWarn }
    })
  }, [items, list, level, semester])

  const todo = rows.filter(r => !r.problem && r.state !== 'done' && r.state !== 'uploading')
  const attention = rows.filter(r => r.problem && r.state !== 'done').length

  async function runUpload() {
    if (!todo.length) return show('Nothing ready to upload', 'error')
    setRunning(true)
    const folder = `gesa/materials/level${level}/sem${semester}`
    let ok = 0, failed = 0, next = 0
    async function worker() {
      while (next < todo.length) {
        const r = todo[next++]
        patch(r.id, { state: 'uploading', error: '' })
        try {
          const fileUrl = await uploadFile(r.file, folder)
          await addMaterial({
            level, semester,
            courseCode: r.code.trim().toUpperCase(), courseName: r.name.trim(),
            fileUrl, fileName: r.file.name,
          })
          patch(r.id, { state: 'done' }); ok++
        } catch (err) { patch(r.id, { state: 'error', error: err.message || 'Upload failed' }); failed++ }
      }
    }
    await Promise.all([worker(), worker(), worker()])
    await reload()
    setRunning(false)
    if (failed) show(`${ok} uploaded, ${failed} failed. Press Upload again to retry the failed ones.`, 'error')
    else show(`${ok} material${ok === 1 ? '' : 's'} uploaded!`)
  }

  return (
    <div className="card" style={{ marginBottom: 28 }}>
      <h2 style={s.formTitle}>📁 Upload Many Materials</h2>
      <p style={s.hint}>
        Name each file like <code>GM175 - Introduction to Surveying.pdf</code> and the course code and name are picked up
        automatically. You can check and fix them below before uploading.
      </p>

      <div className="form-row">
        <div className="form-group">
          <label>Level *</label>
          <div className="chip-group" style={{ marginTop: 6 }}>
            {LEVELS.map(l => (
              <span key={l} className={`chip${level === l ? ' active' : ''}`} onClick={() => !running && setLevel(l)}>Level {l}</span>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Semester *</label>
          <div className="chip-group" style={{ marginTop: 6 }}>
            {SEMS.map(x => (
              <span key={x} className={`chip${semester === x ? ' active' : ''}`} onClick={() => !running && setSemester(x)}>Sem {x}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <label className="btn btn-gold btn-sm" style={{ cursor: running ? 'not-allowed' : 'pointer' }}>
          📄 Choose files
          <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx" style={{ display: 'none' }} disabled={running}
            onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
        </label>
        <label className="btn btn-ghost btn-sm" style={{ cursor: running ? 'not-allowed' : 'pointer' }}>
          📁 Choose a whole folder
          <input ref={folderRef} type="file" multiple style={{ display: 'none' }} disabled={running}
            onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
        </label>
      </div>
      <p style={s.fieldHint}>Choosing again starts the list over. The folder option works in Chrome and Edge on a computer.</p>
      {skipped > 0 && <p style={s.fieldHint}>Skipped {skipped} file{skipped === 1 ? '' : 's'} that aren't PDF, Word or PowerPoint.</p>}

      {rows.length > 0 && (
        <>
          <p style={{ ...s.hint, marginTop: 16, marginBottom: 8 }}>
            <strong>{rows.length}</strong> file{rows.length === 1 ? '' : 's'} · <strong>{todo.length}</strong> ready
            {attention > 0 && <> · <span style={{ color: 'var(--red)' }}>{attention} need attention</span></>}
          </p>
          <div style={s.previewWrap}>
            <table>
              <thead><tr><th>File</th><th>Course code</th><th>Course name</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map(r => {
                  const locked = running || r.state === 'done' || r.state === 'uploading'
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12, maxWidth: 220, wordBreak: 'break-word' }}>
                        <span className="badge badge-purple" style={{ marginRight: 6 }}>{typeLabel(extOf(r.file.name))}</span>
                        {r.file.name}
                        <div style={{ color: 'var(--dim)', fontSize: 11 }}>{(r.file.size / 1024 / 1024).toFixed(2)} MB</div>
                      </td>
                      <td style={{ minWidth: 110 }}>
                        <input value={r.code} disabled={locked} onChange={e => patch(r.id, { code: e.target.value.toUpperCase() })}
                          placeholder="GM 175" style={{ padding: '6px 8px', fontSize: 12 }} />
                      </td>
                      <td style={{ minWidth: 180 }}>
                        <input value={r.name} disabled={locked} onChange={e => patch(r.id, { name: e.target.value })}
                          placeholder="Course name" style={{ padding: '6px 8px', fontSize: 12 }} />
                      </td>
                      <td style={{ fontSize: 12, minWidth: 120 }}>
                        {r.state === 'done' ? <span style={{ color: 'var(--green)' }}>✓ Uploaded</span>
                          : r.state === 'uploading' ? <span style={{ color: 'var(--muted)' }}><span className="spinner" style={{ width: 12, height: 12 }} /> Uploading…</span>
                          : r.state === 'error' ? <span style={{ color: 'var(--red)' }}>✕ {r.error}</span>
                          : r.problem ? <span style={{ color: 'var(--red)' }}>{r.problem}</span>
                          : <span style={{ color: 'var(--gold2)' }}>Ready</span>}
                        {r.levelWarn && r.state !== 'done' && <div style={{ color: 'var(--amber, #f59e0b)', fontSize: 11 }}>⚠️ {r.levelWarn}</div>}
                      </td>
                      <td>
                        {!locked && <button type="button" className="btn btn-ghost btn-sm" title="Remove from this batch"
                          onClick={() => setItems(prev => prev.filter(x => x.id !== r.id))}>✕</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-gold" onClick={runUpload} disabled={running || todo.length === 0}>
              {running ? <span className="spinner" /> : `📤 Upload ${todo.length} material${todo.length === 1 ? '' : 's'}`}
            </button>
            {!running && <button type="button" className="btn btn-ghost" onClick={() => { setItems([]); setSkipped(0) }}>Clear list</button>}
          </div>
        </>
      )}
    </div>
  )
}

export default function MaterialsPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState(EMPTY)
  const [file, setFile]         = useState(null)
  const [saving, setSaving]     = useState(false)
  const [progress, setProgress] = useState('')
  const [mode, setMode]         = useState('one') // 'one' | 'many'
  const { show, Toast }         = useToast()

  const load = async () => { setLoading(true); setList(await getMaterials()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.courseCode || !file) return show('Fill course code and pick a file', 'error')
    setSaving(true)
    setProgress('Uploading to Cloudinary…')
    try {
      const folder    = `gesa/materials/level${form.level}/sem${form.semester}`
      const fileUrl   = await uploadFile(file, folder)
      const fileName  = file.name
      setProgress('Saving to database…')
      await addMaterial({ ...form, fileUrl, fileName })
      await load(); setForm(EMPTY); setFile(null)
      setProgress('')
      show('Material uploaded!')
    } catch (err) { show(err.message, 'error'); setProgress('') }
    finally { setSaving(false) }
  }

  async function handleDelete(id, code) {
    if (!confirm(`Delete ${code}?`)) return
    await deleteMaterial(id); await load(); show('Deleted.')
  }

  // Group by level
  const grouped = LEVELS.reduce((acc, lvl) => {
    acc[lvl] = list.filter(m => String(m.level) === lvl)
    return acc
  }, {})

  return (
    <div>
      {Toast}
      <h1 style={s.title}>Learning Materials</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" className={`btn btn-sm ${mode === 'one' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setMode('one')}>➕ Upload one</button>
        <button type="button" className={`btn btn-sm ${mode === 'many' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setMode('many')}>📁 Upload many</button>
      </div>

      {mode === 'many' ? <BulkUpload list={list} reload={load} show={show} /> : (
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={s.formTitle}>➕ Upload Material</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Level *</label>
              <div className="chip-group" style={{marginTop:6}}>
                {LEVELS.map(l=>(
                  <span key={l} className={`chip${form.level===l?' active':''}`} onClick={()=>setForm(f=>({...f,level:l}))}>Level {l}</span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Semester *</label>
              <div className="chip-group" style={{marginTop:6}}>
                {SEMS.map(s=>(
                  <span key={s} className={`chip${form.semester===s?' active':''}`} onClick={()=>setForm(f=>({...f,semester:s}))}>Sem {s}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Course Code *</label>
              <input value={form.courseCode} onChange={e=>setForm(f=>({...f,courseCode:e.target.value.toUpperCase()}))} placeholder="e.g. GE 305" />
            </div>
            <div className="form-group">
              <label>Course Name</label>
              <input value={form.courseName} onChange={e=>setForm(f=>({...f,courseName:e.target.value}))} placeholder="e.g. Remote Sensing" />
            </div>
          </div>
          <div className="form-group">
            <label>File * <span style={{color:'var(--muted)',fontWeight:400}}>(PDF, Word, PowerPoint)</span></label>
            <input
              type="file" accept=".pdf,.docx,.pptx,.doc,.ppt"
              onChange={e=>setFile(e.target.files[0])}
              style={{padding:'8px 12px'}}
            />
            {file && <p style={{fontSize:12,color:'var(--gold2)',marginTop:4}}>📄 {file.name} ({(file.size/1024/1024).toFixed(2)} MB)</p>}
          </div>
          {progress && <p style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>⏳ {progress}</p>}
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? <span className="spinner"/> : '📤 Upload Material'}
          </button>
        </form>
      </div>
      )}

      {/* Grouped by level */}
      {LEVELS.map(lvl => (
        grouped[lvl].length > 0 && (
          <div key={lvl} className="card" style={{marginBottom:16}}>
            <h2 style={s.formTitle}>Level {lvl} ({grouped[lvl].length} materials)</h2>
            <table>
              <thead><tr><th>Code</th><th>Course Name</th><th>Sem</th><th>File</th><th>Actions</th></tr></thead>
              <tbody>
                {grouped[lvl].map(m=>(
                  <tr key={m.id}>
                    <td style={{fontWeight:700,color:'var(--gold3)'}}>{m.courseCode}</td>
                    <td>{m.courseName}</td>
                    <td><span className="badge badge-purple">Sem {m.semester}</span></td>
                    <td>
                      <a href={m.fileUrl} target="_blank" rel="noreferrer" style={{color:'var(--blue)',fontSize:12}}>
                        📄 {m.fileName ? m.fileName.split('.').pop().toUpperCase() : 'View'}
                      </a>
                    </td>
                    <td>
                      <button className="btn btn-red btn-sm" onClick={()=>handleDelete(m.id,m.courseCode)}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ))}

      {!loading && list.length === 0 && (
        <div className="card">
          <div className="empty-state"><div className="icon">📚</div><p>No materials uploaded yet</p></div>
        </div>
      )}
    </div>
  )
}

const s = {
  title:     { fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 },
  formTitle: { fontSize: 15, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16 },
  hint:      { color: 'var(--muted)', fontSize: 13, marginBottom: 16, maxWidth: '70ch', lineHeight: 1.6 },
  fieldHint: { color: 'var(--muted)', fontSize: 11, marginTop: 4 },
  previewWrap: { maxHeight: 420, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 },
}
