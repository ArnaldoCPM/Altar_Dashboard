import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyBhWhXdwjqDaG5oPLN-l-Ts7EVHF6-wkuI",
    authDomain: "dashboard-servidores.firebaseapp.com",
    projectId: "dashboard-servidores",
    storageBucket: "dashboard-servidores.firebasestorage.app",
    messagingSenderId: "991942921277",
    appId: "1:991942921277:web:a44ac020b4881195bdae54"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
    app,
    auth,
    db,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    deleteDoc,
    writeBatch
};
