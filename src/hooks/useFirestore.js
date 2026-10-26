import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, Timestamp, setDoc, writeBatch,
} from 'firebase/firestore'
import { db, auth } from '../firebase'

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
  welcomeMessage: d.welcomeMessage || '',
  whatsapp: d.whatsapp || '',
  isWelfareChair: !!d.isWelfareChair,
})
export const updateExecutive = (id, d) => updateItem('executives', id, d)
export const deleteExecutive = id => deleteItem('executives', id)

// ─── Business Hub ─────────────────────────────────────────────────────────────
// businesses: { name, shortDescription, description, ownerName, phone, whatsapp,
//               email, website, products: [{ name, price, imageUrl }] (max 3), logoUrl, ownerPhotoUrl, order, visible, createdAt }
export const getBusinesses = () => fetchCollection('businesses', orderBy('order', 'asc'))
export const addBusiness   = d => addDoc(collection(db, 'businesses'), {
  name: d.name, shortDescription: d.shortDescription || '',
  description: d.description || '', ownerName: d.ownerName || '',
  phone: d.phone || '', whatsapp: d.whatsapp || '', email: d.email || '',
  website: d.website || '',
  products: d.products || [],
  logoUrl: d.logoUrl || '', ownerPhotoUrl: d.ownerPhotoUrl || '',
  order: Number(d.order) || 99, visible: d.visible !== false,
  createdAt: Timestamp.now(),
})
export const updateBusiness = (id, d) => updateItem('businesses', id, d)
export const deleteBusiness = id => deleteItem('businesses', id)

// ─── Lecturers ────────────────────────────────────────────────────────────────
export const getLecturers = () => fetchCollection('lecturers')
export const addLecturer  = d => addDoc(collection(db, 'lecturers'), {
  name: d.name, title: d.title || 'Lecturer', major: d.major || '',
  phone: d.phone || '', email: d.email || '',
  pinnedRole: d.pinnedRole || '', // '' | 'HOD' | 'Principal'
  photoUrl: d.photoUrl || '',
  hodMessage: d.hodMessage || '',
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
// Adds many words at once (each already carries its own date). Firestore batches
// are capped at 500 writes, so big lists are saved in chunks.
export async function addWordsBulk(words) {
  for (let i = 0; i < words.length; i += 400) {
    const batch = writeBatch(db)
    words.slice(i, i + 400).forEach(w => {
      batch.set(doc(collection(db, 'wordOfTheDay')), {
        word: w.word, type: w.type || '', definition: w.definition,
        example: w.example || '', date: w.date,
      })
    })
    await batch.commit()
  }
}

// ─── Meme of the day (exam countdown screen) ──────────────────────────────────
// memes: { imageUrl, reserved, createdAt }
//   reserved === false → part of the daily rotation (one per day, in upload order)
//   reserved === true  → never rotates; only shows while the admin has pinned it
// The pin lives in siteContent/home as `pinnedMemeId` ('' or missing = rotation).
export const getMemes   = () => fetchCollection('memes', orderBy('createdAt', 'asc'))
export const addMeme    = d => addDoc(collection(db, 'memes'), {
  imageUrl: d.imageUrl, reserved: !!d.reserved, createdAt: Timestamp.now(),
})
export const updateMeme = (id, d) => updateItem('memes', id, d)
export const deleteMeme = id => deleteItem('memes', id)
export async function getPinnedMemeId() {
  const content = await getSiteContent()
  return content.pinnedMemeId || ''
}
export const setPinnedMemeId = id => updateSiteContent({ pinnedMemeId: id || '' })

// Which meme the app shows right now. Keep identical to pickMemeOfTheDay in the
// student app (gesa-app/src/hooks/useFirestore.js) so the badge here is truthful.
export function pickMemeOfTheDay(memes, pinnedId, now = Date.now()) {
  if (!memes.length) return null
  if (pinnedId) {
    const pinned = memes.find(m => m.id === pinnedId)
    if (pinned) return pinned
  }
  const pool = memes.filter(m => !m.reserved)
  if (!pool.length) return null
  return pool[Math.floor(now / 86400000) % pool.length]
}

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

// ─── Software ─────────────────────────────────────────────────────────────────
export const getSoftware   = () => fetchCollection('software', orderBy('createdAt', 'desc'))
export const addSoftware   = d => addDoc(collection(db, 'software'), {
  name: d.name, category: d.category || '',
  imageUrl: d.imageUrl || '', downloadUrl: d.downloadUrl || '',
  description: d.description || '', fileSize: d.fileSize || '',
  installVideoUrl: d.installVideoUrl || '',
  createdAt: Timestamp.now(),
})
export const updateSoftware = (id, d) => updateItem('software', id, d)
export const deleteSoftware = id => deleteItem('software', id)

// ─── Tutorials ────────────────────────────────────────────────────────────────
export const getTutorials  = () => fetchCollection('tutorials', orderBy('createdAt', 'desc'))
export const addTutorial   = d => addDoc(collection(db, 'tutorials'), {
  title: d.title, software: d.software || '',
  youtubeUrl: d.youtubeUrl || '', thumbnailUrl: d.thumbnailUrl || '',
  description: d.description || '',
  createdAt: Timestamp.now(),
})
export const deleteTutorial = id => deleteItem('tutorials', id)

// ─── Reports (student → admin) ─────────────────────────────────────────────────
export const getReports    = () => fetchCollection('reports', orderBy('createdAt', 'desc'))
export const updateReport  = (id, d) => updateItem('reports', id, d)
export const deleteReport  = id => deleteItem('reports', id)
export const resolveReport = id => updateItem('reports', id, { status: 'resolved' })
export const reopenReport  = id => updateItem('reports', id, { status: 'open' })

// ─── Hero Slides (public site homepage carousel) ──────────────────────────────
export const getHeroSlides   = () => fetchCollection('heroSlides', orderBy('order', 'asc'))
export const addHeroSlide    = d => addDoc(collection(db, 'heroSlides'), {
  imageUrl: d.imageUrl, caption: d.caption || '', order: Number(d.order) || 99,
})
export const updateHeroSlide = (id, d) => updateItem('heroSlides', id, d)
export const deleteHeroSlide = id => deleteItem('heroSlides', id)

// ─── Gallery Photos (public site) ──────────────────────────────────────────────
export const getGalleryPhotos = () => fetchCollection('galleryPhotos', orderBy('createdAt', 'desc'))
export const addGalleryPhoto  = d => addDoc(collection(db, 'galleryPhotos'), {
  imageUrl: d.imageUrl, caption: d.caption || '', createdAt: Timestamp.now(),
})
export const deleteGalleryPhoto = id => deleteItem('galleryPhotos', id)

// ─── Site Content (single doc: About text, tagline, contact info) ─────────────
export async function getSiteContent() {
  const snap = await getDocs(query(collection(db, 'siteContent')))
  const d = snap.docs.find(x => x.id === 'home')
  return d ? d.data() : {}
}
export const updateSiteContent = data => setDoc(doc(db, 'siteContent', 'home'), data, { merge: true })

// ─── Site Links (open-ended list — Dues, Election, program pages, anything) ───
export const getSiteLinks   = () => fetchCollection('siteLinks', orderBy('order', 'asc'))
export const addSiteLink    = d => addDoc(collection(db, 'siteLinks'), {
  label: d.label, url: d.url, order: Number(d.order) || 99,
})
export const updateSiteLink = (id, d) => updateItem('siteLinks', id, d)
export const deleteSiteLink = id => deleteItem('siteLinks', id)

// ─── Push tokens ──────────────────────────────────────────────────────────────
export async function getAllPushTokens() {
  const snap = await getDocs(collection(db, 'pushTokens'))
  return snap.docs.map(d => d.data().token).filter(Boolean)
}

// Token documents are keyed by the token with non-alphanumerics replaced by "_"
// (same rule as the student app uses when it saves them).
export const deletePushToken = token => deleteItem('pushTokens', token.replace(/[^a-zA-Z0-9]/g, '_'))

// Returns { attempted, sent, failed, errors, deadTokens }.
// `sent` = accepted by Expo for delivery; `failed` messages say why in `errors`.
export async function sendPushNotification(title, body) {
  const tokens = await getAllPushTokens()
  if (!tokens.length) throw new Error('No registered devices yet')
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('You are signed out. Sign in again.')
  const res = await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ tokens, title, body }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Failed to send notifications')

  // Phones that uninstalled the app (or reinstalled, which makes a new token) can never
  // receive anything again. Clean them out so the device count stays honest.
  await Promise.allSettled((data.deadTokens || []).map(deletePushToken))
  return data
}
