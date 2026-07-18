import { db } from "../firebase.js";
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Obtiene un usuario por su UID.
 * @param {string} uid UID de Firebase Authentication del usuario.
 * @returns {Promise<Object|null>} Documento de usuario esperado o `null` cuando no exista.
 */
async function getUserByUid(uid) {
  if (!uid) {
    return null;
  }

  const usersRef = collection(db, "users");
  const usersQuery = query(usersRef, where("uid", "==", uid), limit(1));
  console.log("DB:", db);
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

/**
 * Actualiza un usuario existente por UID.
 * @param {string} uid UID del usuario a actualizar.
 * @param {Object} userData Campos del usuario a modificar.
 * @returns {Promise<Object|null>} Usuario actualizado o resultado esperado de la operación.
 */
async function updateUser(userId, userData) {
  const userDocRef = doc(db, "users", userId);
  const payload = {
    ...userData,
    updatedAt: serverTimestamp()
  };

  await updateDoc(userDocRef, payload);

  return {
    id: userId,
    ...payload
  };
}

/**
 * Desactiva un usuario sin eliminar su documento.
 * @param {string} uid UID del usuario que se desea desactivar.
 * @returns {Promise<Object|null>} Usuario desactivado o resultado esperado de la operación.
 */
async function disableUser(userId) {
  const payload = {
    active: false,
    status: "disabled",
    updatedAt: serverTimestamp()
  };

  const userDocRef = doc(db, "users", userId);

  await updateDoc(userDocRef, payload);

  return {
    id: userId,
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
    id: docItem.id,
    ...docItem.data()
  }));
}

/**
 * Vincula el UID de Firebase Authentication con un usuario existente por email.
 * @param {string} email Correo electrÃ³nico del usuario registrado previamente.
 * @param {string} uid UID de Firebase Authentication a vincular.
 * @returns {Promise<Object|null>} Usuario actualizado con el UID vinculado o `null` si no existe.
 */
async function linkUserUid(email, uid) {
  const firestoreUser = await getUserByEmail(email);

  if (!firestoreUser) {
    return null;
  }

  if (firestoreUser.uid !== null && firestoreUser.uid !== "") {
    throw new Error("User UID already linked.");
  }

  const payload = {
    uid,
    status: "active",
    lastLogin: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const userDocRef = doc(db, "users", firestoreUser.id);

  await updateDoc(userDocRef, payload);

  return {
    ...firestoreUser,
    ...payload
  };
}

/**
 * Resuelve un perfil de usuario base a partir del usuario autenticado actual.
 * @param {Object|null|undefined} user Usuario autenticado recibido desde Firebase Authentication.
 * @returns {Promise<Object|null>} Perfil real si existe en Firestore, perfil placeholder si no existe o `null` si no hay usuario.
 */
async function resolveUserProfile(user) {
  if (!user) {
    return null;
  }

  const placeholderProfile = {
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    displayName: user?.displayName ?? null,
    role: null,
    chapelId: null,
    active: true
  };

  const firestoreProfile = await getUserByEmail(user.email);

  if (firestoreProfile) {
    return firestoreProfile;
  }

  return placeholderProfile;
}

export {
  getUserByUid,
  getUserByEmail,
  createUser,
  updateUser,
  disableUser,
  getAllUsers,
  linkUserUid,
  resolveUserProfile
};
