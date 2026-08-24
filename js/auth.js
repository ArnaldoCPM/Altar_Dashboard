import { auth, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from "./firebase.js";

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: 'select_account'
});

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

const requestPasswordReset = (email) => sendPasswordResetEmail(auth, email);

async function performLogout() {
    try {
        await signOut(auth);
    } catch (err) {
        console.error('Firebase logout failed:', err);
        throw err;
    }
}

export {
    initAuth,
    setupAuthStateListener,
    loginWithEmailPassword,
    loginWithGoogle,
    requestPasswordReset,
    performLogout
};
