import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import WaveBackground    from './components/WaveBackground'
import Sidebar           from './components/Sidebar'
import LoginPage         from './pages/LoginPage'
import Dashboard         from './pages/Dashboard'
import ExecutivesPage    from './pages/ExecutivesPage'
import LecturersPage     from './pages/LecturersPage'
import EventsPage        from './pages/EventsPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import WordsPage         from './pages/WordsPage'
import MaterialsPage     from './pages/MaterialsPage'
import PastQPage         from './pages/PastQPage'
import ExamsPage         from './pages/ExamsPage'
import NotificationsPage from './pages/NotificationsPage'
import ForumPage        from './pages/ForumPage'
import TimetablePage    from './pages/TimetablePage'
import ReportsPage      from './pages/ReportsPage'
import SoftwarePage     from './pages/SoftwarePage'
import TutorialsPage    from './pages/TutorialsPage'

export default function App() {
  const [user, setUser]       = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Fires on load and whenever sign-in/sign-out happens. For a signed-in
    // user we still have to confirm they're in the /admins allowlist —
    // having a Firebase account isn't the same as being an admin.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'admins', firebaseUser.uid))
          setIsAdmin(snap.exists())
        } catch {
          // Firestore rules deny this read for non-admins, which throws —
          // that denial itself means "not an admin".
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
      setChecking(false)
    })
    return unsubscribe
  }, [])

  function handleLogout() { signOut(auth) }

  if (checking) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <WaveBackground />
        <div style={{
          position: 'relative', zIndex: 1, minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>

      {/* Wave — fixed behind everything */}
      <WaveBackground />

      {/* App content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', minHeight: '100vh' }}>
        {!user
          ? <LoginPage />
          : !isAdmin
          ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
            }}>
              <h2 style={{ color: '#f0ecff' }}>This account doesn't have admin access</h2>
              <p style={{ color: '#9b8ec0' }}>Ask an existing admin to add your account to the allowlist.</p>
              <button className="btn btn-gold" onClick={handleLogout}>Sign out</button>
            </div>
          )
          : (
            <>
              <Sidebar onLogout={handleLogout} />
              <main style={{
                flex: 1,
                padding: '24px',
                overflowY: 'auto',
                background: 'transparent',
                // On mobile leave space for the hamburger button
                paddingTop: window.innerWidth < 768 ? '72px' : '32px',
                minWidth: 0, // prevents overflow
              }}>
                <Routes>
                  <Route path="/"              element={<Dashboard />} />
                  <Route path="/executives"    element={<ExecutivesPage />} />
                  <Route path="/lecturers"     element={<LecturersPage />} />
                  <Route path="/events"        element={<EventsPage />} />
                  <Route path="/announcements" element={<AnnouncementsPage />} />
                  <Route path="/words"         element={<WordsPage />} />
                  <Route path="/materials"     element={<MaterialsPage />} />
                  <Route path="/pastquestions" element={<PastQPage />} />
                  <Route path="/exams"         element={<ExamsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/forum"         element={<ForumPage />} />
                  <Route path="/timetable"     element={<TimetablePage />} />
                  <Route path="/reports"       element={<ReportsPage />} />
                  <Route path="/software"      element={<SoftwarePage />} />
                  <Route path="/tutorials"     element={<TutorialsPage />} />
                  <Route path="*"              element={<Navigate to="/" />} />
                </Routes>
              </main>
            </>
          )
        }
      </div>
    </div>
  )
}
