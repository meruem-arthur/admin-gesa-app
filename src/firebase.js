import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Same Firebase project as the mobile app
const firebaseConfig = {
  apiKey: 'AIzaSyDwTbJQIzr5iA9Bz7AdFla-5cMP2Zt18ZA',
  authDomain: 'gesa-app-2026.firebaseapp.com',
  projectId: 'gesa-app-2026',
  storageBucket: 'gesa-app-2026.firebasestorage.app',
  messagingSenderId: '1053669315305',
  appId: '1:1053669315305:web:f75a8dc46583a15c429678',
}

const app = initializeApp(firebaseConfig)
export const db  = getFirestore(app)
export const storage = getStorage(app)
