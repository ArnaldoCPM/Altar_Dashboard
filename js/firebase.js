import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, connectAuthEmulator, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { getFirestore, connectFirestoreEmulator, collection, doc, setDoc, getDoc, onSnapshot, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const functions = getFunctions(app);

const isLocalHost = ["localhost", "127.0.0.1", "::1"]
    .includes(window.location.hostname);
const isExplicitlyEnabled = new URLSearchParams(window.location.search)
    .get("emulator") === "1";
const useEmulators = isLocalHost && isExplicitlyEnabled;

if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export {
    app,
    auth,
    db,
    functions,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    deleteDoc,
    writeBatch,
    httpsCallable
};
