# GESA Admin Dashboard

Web admin panel for the GESA UMaT mobile app.
Built with React + Vite. Connects to the same Firebase project as the app.

## Setup

```bash
cd gesa-admin
npm install
npm run dev
```

Open http://localhost:5173 and enter the admin password.

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import the repo
3. Framework: Vite (auto-detected)
4. Click Deploy

Your dashboard will be live at `https://gesa-admin.vercel.app` (or similar)

## What you can manage

| Section        | Actions                          |
|----------------|----------------------------------|
| Executives     | Add, edit, delete, upload photo  |
| Lecturers      | Add, edit, delete, upload photo  |
| Events         | Add, delete                      |
| Announcements  | Post, delete                     |
| Word of Day    | Add, delete                      |
| Materials      | Upload PDF, delete               |
| Past Questions | Upload PDF, delete               |
| Exams          | Add exam dates, delete           |
| Notifications  | Blast push to all students       |

All changes reflect instantly in the GESA mobile app.

## Stack
- React 18 + Vite
- Firebase Firestore (same project as app)
- Cloudinary (same account as app)
- React Router v6
- Deployed on Vercel
