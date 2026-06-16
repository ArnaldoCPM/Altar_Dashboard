/**
 * Lista todas las capillas registradas en el sistema.
 * @returns {Promise<Array>} Colección esperada de documentos de capillas.
 */
async function getAllChapters() {
  throw new Error("Not implemented");
}

/**
 * Obtiene una capilla por su identificador.
 * @param {string} chapelId Identificador único de la capilla.
 * @returns {Promise<Object|null>} Documento de capilla esperado o `null` cuando no exista.
 */
async function getChapelById(chapelId) {
  void chapelId;
  throw new Error("Not implemented");
}

/**
 * Crea una nueva capilla en la capa de datos.
 * @param {Object} chapelData Datos esperados de la capilla, por ejemplo `id`, `name`, `city`, `active` y `createdAt`.
 * @returns {Promise<Object|null>} Capilla creada o metadatos esperados de la operación.
 */
async function createChapel(chapelData) {
  void chapelData;
  throw new Error("Not implemented");
}

/**
 * Actualiza una capilla existente por su identificador.
 * @param {string} chapelId Identificador de la capilla a actualizar.
 * @param {Object} chapelData Campos de la capilla a modificar.
 * @returns {Promise<Object|null>} Capilla actualizada o resultado esperado de la operación.
 */
async function updateChapel(chapelId, chapelData) {
  void chapelId;
  void chapelData;
  throw new Error("Not implemented");
}

/**
 * Desactiva una capilla sin eliminar su documento.
 * @param {string} chapelId Identificador de la capilla que se desea desactivar.
 * @returns {Promise<Object|null>} Capilla desactivada o resultado esperado de la operación.
 */
async function disableChapel(chapelId) {
  void chapelId;
  throw new Error("Not implemented");
}

export {
  getAllChapters,
  getChapelById,
  createChapel,
  updateChapel,
  disableChapel
};
