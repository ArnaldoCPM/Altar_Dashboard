/**
 * Lista todos los servidores del altar registrados en el sistema.
 * @returns {Promise<Array>} Colección esperada de documentos de servidores.
 */
async function getAllServers() {
  throw new Error("Not implemented");
}

/**
 * Obtiene un servidor del altar por su identificador.
 * @param {string} serverId Identificador único del servidor.
 * @returns {Promise<Object|null>} Documento de servidor esperado o `null` cuando no exista.
 */
async function getServerById(serverId) {
  void serverId;
  throw new Error("Not implemented");
}

/**
 * Crea un nuevo servidor del altar en la capa de datos.
 * @param {Object} serverData Datos esperados del servidor a registrar.
 * @returns {Promise<Object|null>} Servidor creado o metadatos esperados de la operación.
 */
async function createServer(serverData) {
  void serverData;
  throw new Error("Not implemented");
}

/**
 * Actualiza un servidor del altar existente por su identificador.
 * @param {string} serverId Identificador del servidor a actualizar.
 * @param {Object} serverData Campos del servidor a modificar.
 * @returns {Promise<Object|null>} Servidor actualizado o resultado esperado de la operación.
 */
async function updateServer(serverId, serverData) {
  void serverId;
  void serverData;
  throw new Error("Not implemented");
}

/**
 * Elimina un servidor del altar por su identificador.
 * @param {string} serverId Identificador del servidor que se desea eliminar.
 * @returns {Promise<Object|null>} Resultado esperado de la eliminación o metadatos asociados.
 */
async function deleteServer(serverId) {
  void serverId;
  throw new Error("Not implemented");
}

/**
 * Lista los servidores asociados a una capilla específica.
 * @param {string} chapelId Identificador de la capilla.
 * @returns {Promise<Array>} Colección esperada de servidores vinculados a la capilla.
 */
async function getServersByChapel(chapelId) {
  void chapelId;
  throw new Error("Not implemented");
}

export {
  getAllServers,
  getServerById,
  createServer,
  updateServer,
  deleteServer,
  getServersByChapel
};
