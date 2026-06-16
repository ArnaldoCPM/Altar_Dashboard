import { db } from "../firebase.js";
import { collection, getDocs, limit, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Obtiene un usuario por su UID.
 * @param {string} uid UID de Firebase Authentication del usuario.
 * @returns {Promise<Object|null>} Documento de usuario esperado o `null` cuando no exista.
 */
async function getUserByUid(uid) {
  void uid;
  throw new Error("Not implemented");
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
  void userData;
  throw new Error("Not implemented");
}

/**
 * Actualiza un usuario existente por UID.
 * @param {string} uid UID del usuario a actualizar.
 * @param {Object} userData Campos del usuario a modificar.
 * @returns {Promise<Object|null>} Usuario actualizado o resultado esperado de la operación.
 */
async function updateUser(uid, userData) {
  void uid;
  void userData;
  throw new Error("Not implemented");
}

/**
 * Desactiva un usuario sin eliminar su documento.
 * @param {string} uid UID del usuario que se desea desactivar.
 * @returns {Promise<Object|null>} Usuario desactivado o resultado esperado de la operación.
 */
async function disableUser(uid) {
  void uid;
  throw new Error("Not implemented");
}

/**
 * Lista todos los usuarios del sistema.
 * @returns {Promise<Array>} Colección esperada de documentos de usuario.
 */
async function getAllUsers() {
  throw new Error("Not implemented");
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
  resolveUserProfile
};
