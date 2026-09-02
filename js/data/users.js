import { auth, db, functions, httpsCallable, signOut } from "../firebase.js";
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Obtiene un usuario por su UID.
 * @param {string} uid UID de Firebase Authentication del usuario.
 * @returns {Promise<Object|null>} Documento de usuario esperado o `null` cuando no exista.
 */
async function getUserByUid(uid) {
  if (!uid) {
    return null;
  }

  const userDoc = await getDoc(doc(db, "users", uid));

  if (!userDoc.exists()) {
    return null;
  }

  return {
    id: userDoc.id,
    ...userDoc.data()
  };
}

/**
 * Obtiene un usuario por su correo electrónico.
 * @param {string} email Correo electrónico del usuario a buscar.
 * @returns {Promise<Object|null>} Documento de usuario esperado o `null` cuando no exista.
 */
async function getUserByEmail(email) {
  if (!email) {
    return null;
  }

  const usersRef = collection(db, "users");
  const usersQuery = query(usersRef, where("email", "==", email), limit(1));
  const snapshot = await getDocs(usersQuery);

  if (snapshot.empty) {
    return null;
  }

  const userDoc = snapshot.docs[0];

  return {
    id: userDoc.id,
    ...userDoc.data()
  };
}

/**
 * Crea un nuevo usuario en la capa de datos.
 * @param {Object} userData Datos esperados del usuario, por ejemplo `uid`, `email`, `displayName`, `role`, `chapelId`, `active`, `createdAt` y `lastLogin`.
 * @returns {Promise<Object|null>} Usuario creado o metadatos de creación esperados.
 */
async function createUser(userData) {
  if (!userData?.id) {
    throw new Error("createUser requires userData.id");
  }

  const userDocRef = doc(db, "users", userData.id);
  const payload = {
    uid: userData.uid ?? null,
    status: userData.status ?? "pending",
    active: userData.active ?? true,
    createdAt: userData.createdAt ?? serverTimestamp(),
    ...userData,
    updatedAt: serverTimestamp()
  };

  await setDoc(userDocRef, payload, { merge: true });

  return {
    id: userData.id,
    ...payload
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function sendUserAccess(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("sendUserAccess requires email");
  }
  const sendAccess = httpsCallable(functions, "sendUserAccess");
  const result = await sendAccess({ email: normalizedEmail });
  return result.data;
}

/**
 * Actualiza un usuario existente por UID.
 * @param {string} uid UID del usuario a actualizar.
 * @param {Object} userData Campos del usuario a modificar.
 * @returns {Promise<Object|null>} Usuario actualizado o resultado esperado de la operación.
 */
async function updateUser(uid, userData) {
  if (!uid) {
    throw new Error("updateUser requires uid");
  }

  const userDocRef = doc(db, "users", uid);
  const payload = {
    ...userData,
    updatedAt: serverTimestamp()
  };

  await updateDoc(userDocRef, payload);

  return {
    id: uid,
    ...payload
  };
}

/**
 * Desactiva un usuario sin eliminar su documento.
 * @param {string} uid UID del usuario que se desea desactivar.
 * @returns {Promise<Object|null>} Usuario desactivado o resultado esperado de la operación.
 */
async function disableUser(uid) {
  if (!uid) {
    throw new Error("disableUser requires uid");
  }

  const payload = {
    active: false,
    status: "disabled",
    updatedAt: serverTimestamp()
  };

  const userDocRef = doc(db, "users", uid);

  await updateDoc(userDocRef, payload);

  return {
    id: uid,
    ...payload
  };
}

/**
 * Lista todos los usuarios del sistema.
 * @returns {Promise<Array>} Colección esperada de documentos de usuario.
 */
async function getAllUsers() {
  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);

  return snapshot.docs.map(docItem => ({
    ...docItem.data(),
    documentId: docItem.id
  }));
}

async function rejectUnauthorizedUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Unable to sign out unauthorized user:", error);
  }

  return null;
}

/**
 * Resuelve un perfil de usuario base a partir del usuario autenticado actual.
 * @param {Object|null|undefined} user Usuario autenticado recibido desde Firebase Authentication.
 * @returns {Promise<Object|null>} Perfil real si existe en Firestore o `null` si no está autorizado.
 */
async function resolveUserProfile(user) {
  if (!user) {
    return null;
  }

  try {
    const firestoreProfile = await getUserByUid(user.uid);

    if (firestoreProfile) {
      return firestoreProfile;
    }

    // La ausencia del perfil canónico no autoriza ningún fallback a users/{email}.
    // Un administrador debe ejecutar sendUserAccess para consolidar una invitación.
    return rejectUnauthorizedUser();
  } catch (error) {
    console.error("Unable to resolve authenticated user profile:", error);
    return rejectUnauthorizedUser();
  }

}

export {
  getUserByUid,
  getUserByEmail,
  createUser,
  normalizeEmail,
  sendUserAccess,
  updateUser,
  disableUser,
  getAllUsers,
  resolveUserProfile
};
