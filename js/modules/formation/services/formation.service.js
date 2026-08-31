import { db } from "../../../firebase.js";
import {
    addDoc,
    collection,
    deleteField,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const formationsCollection = collection(db, "formations");

function toTimestampDate(value) {
    return new Date(`${value}T00:00:00`);
}

function formationPayload(formation, clearMissingDates = false) {
    return {
        ...formation,
        ...(formation.startDate
            ? { startDate: toTimestampDate(formation.startDate) }
            : clearMissingDates ? { startDate: deleteField() } : {}),
        ...(formation.endDate
            ? { endDate: toTimestampDate(formation.endDate) }
            : clearMissingDates ? { endDate: deleteField() } : {}),
        ...(formation.referenceDate
            ? { referenceDate: toTimestampDate(formation.referenceDate) }
            : clearMissingDates ? { referenceDate: deleteField() } : {})
    };
}

function toFormation(snapshot) {
    return {
        id: snapshot.id,
        ...snapshot.data()
    };
}

function subscribeToFormations(onData, onError) {
    const formationsQuery = query(formationsCollection, orderBy("createdAt", "desc"));

    return onSnapshot(formationsQuery, (snapshot) => {
        onData(snapshot.docs.map(toFormation));
    }, onError);
}

async function getFormation(formationId) {
    const snapshot = await getDoc(doc(db, "formations", formationId));
    return snapshot.exists() ? toFormation(snapshot) : null;
}

async function createFormation(formation) {
    const payload = {
        ...formationPayload(formation),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    return addDoc(formationsCollection, payload);
}

async function createFormationWithGroups(formation, groups = [], rosterByGroupId = {}) {
    const reference = doc(formationsCollection);
    const batch = writeBatch(db);
    const rosterEntries = Object.values(rosterByGroupId).flat();
    if (1 + groups.length + rosterEntries.length > 499) throw new Error("A formação ultrapassa o limite de 499 registros iniciais. Reduza os grupos ou participantes.");
    batch.set(reference, { ...formationPayload(formation), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    groups.forEach((group) => {
        const pole = doc(collection(reference, "poles"));
        batch.set(pole, { groupId: group.id, name: group.name, baseChapelId: group.baseChapelId, chapelIds: group.chapelIds, coordinatorIds: group.defaultCoordinatorIds || [], active: true, catalogSnapshotAt: serverTimestamp(), rosterPreparedAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        (rosterByGroupId[group.id] || []).forEach((member) => batch.set(doc(collection(pole, "roster"), member.serverId), { ...member, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    });
    await batch.commit();
    return reference.id;
}

async function updateFormation(formationId, formation) {
    await updateDoc(doc(db, "formations", formationId), {
        ...formationPayload(formation, true),
        updatedAt: serverTimestamp()
    });
}

async function updateFormationStatus(formationId, status) {
    await updateDoc(doc(db, "formations", formationId), {
        status,
        updatedAt: serverTimestamp()
    });
}

export {
    createFormation,
    createFormationWithGroups,
    getFormation,
    subscribeToFormations,
    updateFormation,
    updateFormationStatus
};
