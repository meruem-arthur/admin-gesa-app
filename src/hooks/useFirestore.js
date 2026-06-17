import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, Timestamp, setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

// ─── Generic fetch ────────────────────────────────────────────────────────────
export async function fetchCollection(col, ...queryConstraints) {
  const q = queryConstraints.length
    ? query(collection(db, col), ...queryConstraints)
    : collection(db, col)
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteItem(col, id) {
  return deleteDoc(doc(db, col, id))
}

export async function updateItem(col, id, data) {
  return updateDoc(doc(db, col, id), data)
}

// ─── Executives ───────────────────────────────────────────────────────────────
export const getExecutives = () => fetchCollection('executives', orderBy('order', 'asc'))
export const addExecutive  = d => addDoc(collection(db, 'executives'), {
  name: d.name, position: d.position, order: Number(d.order) || 99,
  photoUrl: d.photoUrl || '', phone: d.phone || '', bio: d.bio || '',
})
export const updateExecutive = (id, d) => updateItem('executives', id, d)
export const deleteExecutive = id => deleteItem('executives', id)

// ─── Lecturers ────────────────────────────────────────────────────────────────
export const getLecturers = () => fetchCollection('lecturers')
export const addLecturer  = d => addDoc(collection(db, 'lecturers'), {
  name: d.name, title: d.title || 'Lecturer', major: d.major || '',
  phone: d.phone || '', email: d.email || '',
  pinnedRole: d.pinnedRole || '', // '' | 'HOD' | 'Dean'
  photoUrl: d.photoUrl || '',
})
export const updateLecturer = (id, d) => updateItem('lecturers', id, d)
export const deleteLecturer = id => deleteItem('lecturers', id)

// ─── Events ───────────────────────────────────────────────────────────────────
export const getEvents = () => fetchCollection('events', orderBy('date', 'asc'))
export const addEvent  = d => addDoc(collection(db, 'events'), {
  title: d.title, description: d.description || '',
  date: Timestamp.fromDate(new Date(d.date)),
  location: d.location || '', tag: d.tag || 'General',
  featured: d.featured || false,
})
export const deleteEvent = id => deleteItem('events', id)

// ─── Announcements ────────────────────────────────────────────────────────────
export const getAnnouncements = () => fetchCollection('announcements', orderBy('createdAt', 'desc'))
export const addAnnouncement  = d => addDoc(collection(db, 'announcements'), {
  title: d.title, body: d.body, tag: d.tag || 'General',
  color: d.color || 'purple', author: d.author || 'GESA Admin',
  createdAt: Timestamp.now(),
})
export const deleteAnnouncement = id => deleteItem('announcements', id)

// ─── Word of the day ──────────────────────────────────────────────────────────
export const getWords    = () => fetchCollection('wordOfTheDay', orderBy('date', 'desc'))
export const addWord     = d => addDoc(collection(db, 'wordOfTheDay'), {
  word: d.word, type: d.type || '', definition: d.definition,
  example: d.example || '', date: d.date,
})
export const deleteWord  = id => deleteItem('wordOfTheDay', id)

// ─── Materials ────────────────────────────────────────────────────────────────
export const getMaterials  = () => fetchCollection('learningMaterials', orderBy('level', 'asc'))
export const addMaterial   = d => addDoc(collection(db, 'learningMaterials'), {
  level: Number(d.level), semester: Number(d.semester),
  courseCode: d.courseCode, courseName: d.courseName,
  fileUrl: d.fileUrl, fileName: d.fileName || '',
  uploadedAt: Timestamp.now(),
})
export const deleteMaterial = id => deleteItem('learningMaterials', id)

// ─── Past Questions ───────────────────────────────────────────────────────────
export const getPastQuestions = () => fetchCollection('pastQuestions', orderBy('level', 'asc'))
export const addPastQuestion  = d => addDoc(collection(db, 'pastQuestions'), {
  level: Number(d.level), semester: Number(d.semester),
  courseCode: d.courseCode, courseName: d.courseName,
  year: Number(d.year), fileUrl: d.fileUrl,
  fileName: d.fileName || '', uploadedAt: Timestamp.now(),
})
export const deletePastQuestion = id => deleteItem('pastQuestions', id)

// ─── Exams ────────────────────────────────────────────────────────────────────
export const getExams = () => fetchCollection('exams', orderBy('startDate', 'asc'))
export const addExam  = d => addDoc(collection(db, 'exams'), {
  title:     d.title,
  startDate: Timestamp.fromDate(new Date(d.startDate)),
  endDate:   d.endDate ? Timestamp.fromDate(new Date(d.endDate)) : null,
  note:      d.note || '',
})
export const deleteExam = id => deleteItem('exams', id)

// ─── Reports (student → admin) ─────────────────────────────────────────────────
export const getReports    = () => fetchCollection('reports', orderBy('createdAt', 'desc'))
export const updateReport  = (id, d) => updateItem('reports', id, d)
export const deleteReport  = id => deleteItem('reports', id)
export const resolveReport = id => updateItem('reports', id, { status: 'resolved' })
export const reopenReport  = id => updateItem('reports', id, { status: 'open' })

// ─── Push tokens ──────────────────────────────────────────────────────────────
export async function getAllPushTokens() {
  const snap = await getDocs(collection(db, 'pushTokens'))
  return snap.docs.map(d => d.data().token).filter(Boolean)
}

export async function sendPushNotification(title, body) {
  const tokens = await getAllPushTokens()
  if (!tokens.length) throw new Error('No registered devices yet')
  const res = await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens, title, body }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to send notifications')
  }
  return tokens.length
}
