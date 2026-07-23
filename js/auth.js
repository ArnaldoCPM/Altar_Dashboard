import { auth, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from "./firebase.js";

const googleProvider = new GoogleAuthProvider();

const initAuth = async (onError) => {
    try {
        return auth;
    } catch (err) {
        if (typeof onError === 'function') {
            onError(err);
        } else {
            console.error('Firebase auth initialization failed:', err);
        }
    }
};

const setupAuthStateListener = (callback) => {
    onAuthStateChanged(auth, callback);
};

const loginWithEmailPassword = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

const loginWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
};

async function performLogout(onError) {
    try {
        await signOut(auth);
    } catch (err) {
        if (typeof onError === 'function') {
            onError(err);
        } else {
            console.error('Firebase logout failed:', err);
        }
    }
}

export {
    initAuth,
    setupAuthStateListener,
    loginWithEmailPassword,
    loginWithGoogle,
    performLogout
};
