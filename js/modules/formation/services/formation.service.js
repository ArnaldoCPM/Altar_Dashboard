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
    updateDoc
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
            : clearMissingDates ? { endDate: deleteField() } : {})
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
    getFormation,
    subscribeToFormations,
    updateFormation,
    updateFormationStatus
};
