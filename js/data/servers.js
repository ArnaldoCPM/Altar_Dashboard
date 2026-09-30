import { canAccessAdminMode } from "../permissions.js";
import { db, doc, setDoc, deleteDoc } from "../firebase.js";
import { getDocs, query, where, runTransaction, refEqual } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { buildServersQuery } from "../serverQuery.js";
import { validateBirthDatePayload, assertBirthDateWrite } from "../services/birth-date.service.js";

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

  validateBirthDatePayload(serverData);

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
  validateBirthDatePayload(serverData);
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

// UI restriction only: existing Rules still permit coordinators within their scope.
function birthDateState(server) {
  return { present: Object.hasOwn(server, "Data_nascimento"), value: copyStoredValue(server.Data_nascimento) };
}

function copyStoredValue(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Uint8Array) return value.slice();
  if (Array.isArray(value)) return value.map(copyStoredValue);
  if (value && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyStoredValue(item)]));
  }
  return value; // Firestore Timestamp, GeoPoint, Bytes and references are immutable SDK values.
}
function sameStoredValue(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (a.constructor !== b.constructor) return false;
  if (a instanceof Date) return a.getTime() === b.getTime();
  if (a.type === "document" && a.firestore && b.firestore) return refEqual(a, b);
  if (typeof a.isEqual === "function") return a.isEqual(b); // Timestamp, GeoPoint, Bytes
  if (a instanceof Uint8Array) return a.length === b.length && a.every((v, i) => v === b[i]);
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => sameStoredValue(v, b[i]));
  if (Object.getPrototypeOf(a) !== Object.prototype && Object.getPrototypeOf(a) !== null) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && sameStoredValue(a[k], b[k]));
}

function sameBirthDateState(a, b) {
  return a.present === b.present && (!a.present || sameStoredValue(a.value, b.value));
}

async function saveReviewedBirthDate({ serverId, expected, nextIso }) {
  if (!canAccessAdminMode()) throw new Error("Esta ferramenta está disponível somente para administradores.");
  if (typeof serverId !== "string" || !serverId || serverId.includes("/") || [".", ".."].includes(serverId)) throw new Error("ID de servidor inválido.");
  if (!expected || typeof expected.present !== "boolean" || (expected.present && !Object.hasOwn(expected, "value"))) throw new Error("Estado original inválido.");
  assertBirthDateWrite(nextIso);
  const ref = doc(db, "artifacts", appId, "public", "data", "servers", serverId);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return { status: "not-found", serverId };
    const current = birthDateState(snapshot.data());
    if (!sameBirthDateState(current, expected)) return { status: "conflict", serverId, current };
    transaction.update(ref, { Data_nascimento: nextIso });
    return { status: "saved", serverId, value: nextIso };
  });
}

export { birthDateState, sameBirthDateState, saveReviewedBirthDate };
