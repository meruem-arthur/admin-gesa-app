import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('gesa_admin') === '1')

  function handleLogin()  { sessionStorage.setItem('gesa_admin', '1'); setAuthed(true)  }
  function handleLogout() { sessionStorage.removeItem('gesa_admin');   setAuthed(false) }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>

      {/* Wave — fixed behind everything */}
      <WaveBackground />

      {/* App content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', minHeight: '100vh' }}>
        {!authed
          ? <LoginPage onLogin={handleLogin} />
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
