import { db } from "../../../firebase.js";
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function participantsCollection(formationId, poleId, encounterId) { return collection(db, "formations", formationId, "poles", poleId, "encounters", encounterId, "participants"); }
function exclusionsCollection(formationId, poleId, encounterId) { return collection(db, "formations", formationId, "poles", poleId, "encounters", encounterId, "participantExclusions"); }
function participantRef(formationId, poleId, encounterId, serverId) { return doc(participantsCollection(formationId, poleId, encounterId), serverId); }
function exclusionRef(formationId, poleId, encounterId, serverId) { return doc(exclusionsCollection(formationId, poleId, encounterId), serverId); }
function toData(snapshot) { return { id: snapshot.id, ...snapshot.data() }; }

function subscribeToParticipants(formationId, poleId, encounterId, onData, onError) { return onSnapshot(query(participantsCollection(formationId, poleId, encounterId), orderBy("serverName", "asc")), (snapshot) => onData(snapshot.docs.map(toData)), onError); }
async function getParticipant(formationId, poleId, encounterId, serverId) { const snapshot = await getDoc(participantRef(formationId, poleId, encounterId, serverId)); return snapshot.exists() ? toData(snapshot) : null; }
async function hasParticipants(formationId, poleId, encounterId) { const snapshot = await getDocs(query(participantsCollection(formationId, poleId, encounterId), limit(1))); return !snapshot.empty; }
async function countPendingParticipants(formationId, poleId, encounterId) { const snapshot = await getDocs(participantsCollection(formationId, poleId, encounterId)); return snapshot.docs.filter((item) => item.data().attendanceStatus === "pending").length; }
async function getParticipantExclusions(formationId, poleId, encounterId) { const snapshot = await getDocs(exclusionsCollection(formationId, poleId, encounterId)); return new Set(snapshot.docs.map((item) => item.id)); }
async function createPreparedParticipants(formationId, poleId, encounterId, participants) { for (let index = 0; index < participants.length; index += 400) { const batch = writeBatch(db); participants.slice(index, index + 400).forEach((participant) => batch.set(participantRef(formationId, poleId, encounterId, participant.serverId), { ...participant, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })); await batch.commit(); } }
async function addParticipant(formationId, poleId, encounterId, participant) { const batch = writeBatch(db); batch.delete(exclusionRef(formationId, poleId, encounterId, participant.serverId)); batch.set(participantRef(formationId, poleId, encounterId, participant.serverId), { ...participant, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); await batch.commit(); }
async function removeParticipant(formationId, poleId, encounterId, serverId, excludedBy) { const batch = writeBatch(db); batch.set(exclusionRef(formationId, poleId, encounterId, serverId), { serverId, excludedBy, createdAt: serverTimestamp() }); batch.delete(participantRef(formationId, poleId, encounterId, serverId)); await batch.commit(); }
function updateAttendance(formationId, poleId, encounterId, serverId, { attendanceStatus, attendanceNote, recordedBy }) {
  const updates = { attendanceStatus, updatedAt: serverTimestamp() };
  if (attendanceStatus === "pending") {
    updates.attendanceNote = deleteField();
    updates.recordedBy = deleteField();
    updates.recordedAt = deleteField();
  } else {
    if (attendanceNote) updates.attendanceNote = attendanceNote;
    else updates.attendanceNote = deleteField();
    updates.recordedBy = recordedBy;
    updates.recordedAt = serverTimestamp();
  }
  return updateDoc(participantRef(formationId, poleId, encounterId, serverId), updates);
}

export { subscribeToParticipants, getParticipant, hasParticipants, countPendingParticipants, getParticipantExclusions, createPreparedParticipants, addParticipant, removeParticipant, updateAttendance };
