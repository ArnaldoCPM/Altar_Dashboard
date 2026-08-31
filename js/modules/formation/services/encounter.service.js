import { db } from "../../../firebase.js";
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

async function getEncounters(formationId, poleId) {
    const snapshot = await getDocs(query(encountersCollection(formationId, poleId), orderBy("startAt", "asc")));
    return snapshot.docs.map(toEncounter);
}

function createEncounter(formationId, poleId, encounter) {
    return addDoc(encountersCollection(formationId, poleId), { ...encounter, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
async function createEncounterWithParticipants(formationId, poleId, encounter, roster) {
    if (!roster.length) throw new Error("Este grupo ainda não possui participantes preparados.");
    if (roster.length > 499) throw new Error("Este grupo possui participantes demais para criar o encontro em uma única operação. Revise a lista de participantes.");
    const reference = doc(encountersCollection(formationId, poleId)); const batch = writeBatch(db);
    batch.set(reference, { ...encounter, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    roster.forEach((member) => batch.set(doc(collection(reference, "participants"), member.serverId), { serverId: member.serverId, serverName: member.serverName, chapelId: member.chapelId, chapelName: member.chapelName, participationType: "regular", attendanceStatus: "pending", addedManually: false, addedBy: encounter.createdBy, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await batch.commit(); return reference.id;
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

export { subscribeToEncounters, getEncounter, getEncounters, createEncounter, createEncounterWithParticipants, updateEncounter, updateEncounterStatus, updateResponsibilities };
