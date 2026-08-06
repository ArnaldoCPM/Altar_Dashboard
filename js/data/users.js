import { auth, db, signOut } from "../firebase.js";
import { collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

/**
 * Vincula el UID de Firebase Authentication con un usuario existente por email.
 * @param {string} email Correo electrónico del usuario registrado previamente.
 * @param {string} uid UID de Firebase Authentication a vincular.
 * @returns {Promise<Object|null>} Usuario actualizado con el UID vinculado o `null` si no existe.
 */
async function linkUserUid(email, uid) {
  if (!email || !uid) {
    return null;
  }

  const legacyUserRef = doc(db, "users", email);
  const canonicalUserRef = doc(db, "users", uid);

  await runTransaction(db, async (transaction) => {
    const canonicalSnapshot = await transaction.get(canonicalUserRef);

    if (canonicalSnapshot.exists()) {
      return;
    }

    const legacySnapshot = await transaction.get(legacyUserRef);

    if (!legacySnapshot.exists()) {
      return;
    }

    const legacyProfile = legacySnapshot.data();

    if (
      legacyProfile.uid !== null &&
      legacyProfile.uid !== "" &&
      legacyProfile.uid !== uid
    ) {
      return;
    }

    // Se conserva el perfil autorizado; el UID es el único campo modificado.
    transaction.set(canonicalUserRef, {
      ...legacyProfile,
      uid
    });
    transaction.delete(legacyUserRef);
  });

  return getUserByUid(uid);
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

    if (!user.email) {
      return rejectUnauthorizedUser();
    }

    const legacySnapshot = await getDoc(doc(db, "users", user.email));

    if (!legacySnapshot.exists()) {
      return rejectUnauthorizedUser();
    }

    const legacyProfile = legacySnapshot.data();
    const canMigrateLegacyProfile =
      legacyProfile.uid === null ||
      legacyProfile.uid === "" ||
      legacyProfile.uid === user.uid;

    if (canMigrateLegacyProfile) {
      await linkUserUid(user.email, user.uid);

      const linkedProfile = await getUserByUid(user.uid);

      if (linkedProfile) {
        return linkedProfile;
      }
    }

    // El documento legacy pertenece a otro usuario o no pudo consolidarse.
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
  updateUser,
  disableUser,
  getAllUsers,
  linkUserUid,
  resolveUserProfile
};
