import { db } from "../../../firebase.js";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function encountersCollection(formationId, poleId) {
    return collection(db, "formations", formationId, "poles", poleId, "encounters");
}

function encounterRef(formationId, poleId, encounterId) {
    return doc(db, "formations", formationId, "poles", poleId, "encounters", encounterId);
}

function toEncounter(snapshot) {
    return { id: snapshot.id, ...snapshot.data() };
}

function subscribeToEncounters(formationId, poleId, onData, onError) {
    return onSnapshot(query(encountersCollection(formationId, poleId), orderBy("startAt", "asc")), (snapshot) => onData(snapshot.docs.map(toEncounter)), onError);
}

async function getEncounter(formationId, poleId, encounterId) {
    const snapshot = await getDoc(encounterRef(formationId, poleId, encounterId));
    return snapshot.exists() ? toEncounter(snapshot) : null;
}

function createEncounter(formationId, poleId, encounter) {
    return addDoc(encountersCollection(formationId, poleId), { ...encounter, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

function updateEncounter(formationId, poleId, encounterId, encounter) {
    return updateDoc(encounterRef(formationId, poleId, encounterId), { ...encounter, updatedAt: serverTimestamp() });
}

function updateEncounterStatus(formationId, poleId, encounterId, status) {
    return updateDoc(encounterRef(formationId, poleId, encounterId), { status, updatedAt: serverTimestamp() });
}

function updateResponsibilities(formationId, poleId, encounterId, responsibilities, coordinatorIds) {
    return updateDoc(encounterRef(formationId, poleId, encounterId), { responsibilities, coordinatorIds, updatedAt: serverTimestamp() });
}

export { subscribeToEncounters, getEncounter, createEncounter, updateEncounter, updateEncounterStatus, updateResponsibilities };
