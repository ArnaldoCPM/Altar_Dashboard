import { db } from "../../../firebase.js";
import {
    addDoc,
    collection,
    doc,
    getCountFromServer,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function polesCollection(formationId) {
    return collection(db, "formations", formationId, "poles");
}

function poleRef(formationId, poleId) {
    return doc(db, "formations", formationId, "poles", poleId);
}

function toPole(snapshot) {
    return { id: snapshot.id, ...snapshot.data() };
}

function subscribeToPoles(formationId, onData, onError) {
    return onSnapshot(query(polesCollection(formationId), orderBy("createdAt", "desc")), (snapshot) => {
        onData(snapshot.docs.map(toPole));
    }, onError);
}

async function countPoles(formationId) {
    const snapshot = await getCountFromServer(polesCollection(formationId));
    return snapshot.data().count;
}

async function getPole(formationId, poleId) {
    const snapshot = await getDoc(poleRef(formationId, poleId));
    return snapshot.exists() ? toPole(snapshot) : null;
}

function createPole(formationId, pole) {
    return addDoc(polesCollection(formationId), {
        ...pole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

function updatePole(formationId, poleId, pole) {
    return updateDoc(poleRef(formationId, poleId), {
        ...pole,
        updatedAt: serverTimestamp()
    });
}

function updatePoleActive(formationId, poleId, active) {
    return updateDoc(poleRef(formationId, poleId), {
        active,
        updatedAt: serverTimestamp()
    });
}

export {
    subscribeToPoles,
    countPoles,
    getPole,
    createPole,
    updatePole,
    updatePoleActive
};
