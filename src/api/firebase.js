import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyACcf-8Vw7oRGwqo3vnDnffgWjy5Rp-G38",
    authDomain: "chengdu-trip-2026.firebaseapp.com",
    projectId: "chengdu-trip-2026",
    storageBucket: "chengdu-trip-2026.firebasestorage.app",
    messagingSenderId: "528720468026",
    appId: "1:528720468026:web:5236608e02e2ed9e91bd03"
  };

// 초기화
const app = initializeApp(firebaseConfig);

// 다른 파일에서 가져다 쓸 수 있게 내보내기(export)
export const auth = getAuth(app);
export const db = getFirestore(app);
export { 
    signInAnonymously, 
    onAuthStateChanged, 
    doc, 
    setDoc, 
    onSnapshot 
  };
  
  export const APP_ID = "chengdu-trip-2026";