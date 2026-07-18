import { db } from "../firebase.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
  getAllChapels,
  getActiveChapels,
  getChapelById,
  createChapel,
  updateChapel,
  disableChapel
};
