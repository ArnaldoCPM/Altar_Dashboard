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
  void email;
  throw new Error("Not implemented");
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

export {
  getUserByUid,
  getUserByEmail,
  createUser,
  updateUser,
  disableUser,
  getAllUsers
};
