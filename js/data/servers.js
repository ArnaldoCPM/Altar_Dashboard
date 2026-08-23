import { db, doc, setDoc, deleteDoc } from "../firebase.js";
import { getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { buildServersQuery } from "../serverQuery.js";

const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

/**
 * Lista todos los servidores del altar registrados en el sistema.
 * @returns {Promise<Array>} Colección esperada de documentos de servidores.
 */
async function getAllServers() {
  const snapshot = await getDocs(buildServersQuery(db));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/**
 * Obtiene un servidor del altar por su identificador.
 * @param {string} serverId Identificador único del servidor.
 * @returns {Promise<Object|null>} Documento de servidor esperado o `null` cuando no exista.
 */
async function getServerById(serverId) {
  if (!serverId) return null;
  const snapshot = await getDoc(doc(db, "artifacts", appId, "public", "data", "servers", serverId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

/**
 * Crea un nuevo servidor del altar en la capa de datos.
 * @param {Object} serverData Datos esperados del servidor a registrar.
 * @returns {Promise<Object|null>} Servidor creado o metadatos esperados de la operación.
 */
async function createServer(serverData) {
  if (!serverData?.id) {
    throw new Error("createServer requires serverData.id");
  }

  const serverDocRef = doc(
    db,
    "artifacts",
    appId,
    "public",
    "data",
    "servers",
    serverData.id
  );

  await setDoc(serverDocRef, serverData, { merge: true });

  return {
    id: serverData.id,
    ...serverData
  };
}

/**
 * Actualiza un servidor del altar existente por su identificador.
 * @param {string} serverId Identificador del servidor a actualizar.
 * @param {Object} serverData Campos del servidor a modificar.
 * @returns {Promise<Object|null>} Servidor actualizado o resultado esperado de la operación.
 */
async function updateServer(serverId, serverData) {
  if (!serverId) throw new Error("updateServer requires serverId");
  await setDoc(doc(db, "artifacts", appId, "public", "data", "servers", serverId), serverData, { merge: true });
  return { id: serverId, ...serverData };
}

/**
 * Elimina un servidor del altar por su identificador.
 * @param {string} serverId Identificador del servidor que se desea eliminar.
 * @returns {Promise<Object|null>} Resultado esperado de la eliminación o metadatos asociados.
 */
async function deleteServer(serverId) {
  if (!serverId) throw new Error("deleteServer requires serverId");
  await deleteDoc(doc(db, "artifacts", appId, "public", "data", "servers", serverId));
  return { id: serverId };
}

/**
 * Lista los servidores asociados a una capilla específica.
 * @param {string} chapelId Identificador de la capilla.
 * @returns {Promise<Array>} Colección esperada de servidores vinculados a la capilla.
 */
async function getServersByChapel(chapelId) {
  return getServersByChapelIds([chapelId]);
}

async function getServersByChapelIds(chapelIds = []) {
  const uniqueIds = [...new Set(chapelIds.filter(Boolean))];
  const servers = [];
  for (let index = 0; index < uniqueIds.length; index += 30) {
    const snapshot = await getDocs(query(buildServersQuery(db), where("chapelId", "in", uniqueIds.slice(index, index + 30))));
    snapshot.forEach((item) => servers.push({ id: item.id, ...item.data() }));
  }
  return servers;
}

export {
  getAllServers,
  getServerById,
  createServer,
  updateServer,
  deleteServer,
  getServersByChapel,
  getServersByChapelIds
};
