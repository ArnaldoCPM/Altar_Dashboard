import { db } from "../firebase.js";

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const SERVER_BATCH_SIZE = 400;

export function normalizeChapelName(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function sanitizeChapelInput(input = {}) {
  const name = String(input.name || "").trim().replace(/\s+/g, " ");
  const address = String(input.address || "").trim();
  const notes = String(input.notes || "").trim();
  if (!name) throw new Error("O nome da capela é obrigatório.");
  if (notes.length > 500) throw new Error("As observações podem ter no máximo 500 caracteres.");
  // Blank strings deliberately clear prior optional values; both remain optional
  // for legacy documents that have never been updated.
  return { name, active: input.active !== false, address, notes };
}

/**
 * Lista todas las capillas registradas en el sistema.
 * @returns {Promise<Array>} Colección esperada de documentos de capillas.
 */
async function getAllChapels() {
  const snapshot = await getDocs(collection(db, "chapels"));

  return snapshot.docs.map(docItem => ({
    id: docItem.id,
    ...docItem.data()
  }));
}

async function getActiveChapels() {
  console.log("Loading chapels...");
  const chapelsRef = collection(db, "chapels");

  const chapelsQuery = query(
    chapelsRef,
    where("active", "==", true)
  );

  const snapshot = await getDocs(chapelsQuery);

  return snapshot.docs.map(docItem => ({
    id: docItem.id,
    ...docItem.data()
  }));
}

/**
 * Obtiene una capilla por su identificador.
 * @param {string} chapelId Identificador único de la capilla.
 * @returns {Promise<Object|null>} Documento de capilla esperado o `null` cuando no exista.
 */
async function getChapelById(chapelId) {

  if (!chapelId) {
    return null;
  }

  const snapshot = await getDoc(
    doc(db, "chapels", chapelId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

/**
 * Crea una nueva capilla en la capa de datos.
 * @param {Object} chapelData Datos esperados de la capilla, por ejemplo `id`, `name`, `city`, `active` y `createdAt`.
 * @returns {Promise<Object|null>} Capilla creada o metadatos esperados de la operación.
 */
async function createChapel(chapelData) {
  const payload = sanitizeChapelInput(chapelData);
  const existing = await getAllChapels();
  if (existing.some((chapel) => normalizeChapelName(chapel.name) === normalizeChapelName(payload.name))) {
    throw new Error("Já existe uma capela com este nome.");
  }
  const ref = await addDoc(collection(db, "chapels"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return { id: ref.id, ...payload };
}

/**
 * Actualiza una capilla existente por su identificador.
 * @param {string} chapelId Identificador de la capilla a actualizar.
 * @param {Object} chapelData Campos de la capilla a modificar.
 * @returns {Promise<Object|null>} Capilla actualizada o resultado esperado de la operación.
 */
async function updateChapel(chapelId, chapelData) {
  if (!chapelId) throw new Error("updateChapel requires chapelId");
  const current = await getChapelById(chapelId);
  if (!current) throw new Error("Capela não encontrada.");
  const payload = sanitizeChapelInput(chapelData);
  const existing = await getAllChapels();
  if (existing.some((chapel) => chapel.id !== chapelId && normalizeChapelName(chapel.name) === normalizeChapelName(payload.name))) {
    throw new Error("Já existe uma capela com este nome.");
  }
  await setDoc(doc(db, "chapels", chapelId), {
    ...payload,
    createdAt: current.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  return { id: chapelId, ...current, ...payload };
}

/**
 * Desactiva una capilla sin eliminar su documento.
 * @param {string} chapelId Identificador de la capilla que se desea desactivar.
 * @returns {Promise<Object|null>} Capilla desactivada o resultado esperado de la operación.
 */
async function disableChapel(chapelId) {
  const current = await getChapelById(chapelId);
  return updateChapel(chapelId, { ...current, active: false });
}

async function countServersByChapel(chapelId) {
  if (!chapelId) return 0;
  const serversRef = collection(db, "artifacts", typeof __app_id !== "undefined" ? __app_id : "default-app-id", "public", "data", "servers");
  const snapshot = await getDocs(query(serversRef, where("chapelId", "==", chapelId)));
  return snapshot.size;
}

async function renameChapelAndSyncServers(chapelId, chapelData, onProgress = () => {}) {
  const current = await getChapelById(chapelId);
  if (!current) throw new Error("Capela não encontrada.");
  const payload = sanitizeChapelInput(chapelData);
  if (normalizeChapelName(current.name) === normalizeChapelName(payload.name)) return updateChapel(chapelId, payload);
  const existing = await getAllChapels();
  if (existing.some((chapel) => chapel.id !== chapelId && normalizeChapelName(chapel.name) === normalizeChapelName(payload.name))) throw new Error("Já existe uma capela com este nome.");
  const serversRef = collection(db, "artifacts", typeof __app_id !== "undefined" ? __app_id : "default-app-id", "public", "data", "servers");
  const snapshot = await getDocs(query(serversRef, where("chapelId", "==", chapelId)));
  let completed = 0;
  for (let offset = 0; offset < snapshot.docs.length; offset += SERVER_BATCH_SIZE) {
    try {
      const batch = writeBatch(db);
      snapshot.docs.slice(offset, offset + SERVER_BATCH_SIZE).forEach((server) => batch.update(server.ref, { Capela: payload.name }));
      await batch.commit();
      completed += Math.min(SERVER_BATCH_SIZE, snapshot.docs.length - offset);
    } catch (error) {
      // Only a failed server batch is a synchronization interruption. The
      // chapel update below is deliberately reported as a separate failure.
      error.syncProgress = { completed, total: snapshot.docs.length };
      throw error;
    }
    // Progress is informational. It must not turn committed writes into a
    // failed rename if a consumer-side callback happens to throw.
    try {
      onProgress({ completed, total: snapshot.docs.length });
    } catch (error) {
      console.warn("Chapel rename progress callback failed.", error);
    }
  }
  try {
    const result = await updateChapel(chapelId, payload);
    return { ...result, syncedServers: completed };
  } catch (error) {
    error.chapelUpdateProgress = { completed, total: snapshot.docs.length };
    throw error;
  }
}

export {
  getAllChapels,
  getActiveChapels,
  getChapelById,
  createChapel,
  updateChapel,
  disableChapel,
  countServersByChapel,
  renameChapelAndSyncServers
};
