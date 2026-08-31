import { db } from "../../../firebase.js";
import { collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const rosterCollection = (formationId, poleId) => collection(db, "formations", formationId, "poles", poleId, "roster");
const rosterRef = (formationId, poleId, serverId) => doc(db, "formations", formationId, "poles", poleId, "roster", serverId);
const toRoster = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });
function subscribeToRoster(formationId, poleId, onData, onError) { return onSnapshot(query(rosterCollection(formationId, poleId), orderBy("serverName")), (snapshot) => onData(snapshot.docs.map(toRoster)), onError); }
async function getRoster(formationId, poleId) { return (await getDocs(query(rosterCollection(formationId, poleId), orderBy("serverName")))).docs.map(toRoster); }
function rosterPayload(item, addedBy) { return { serverId: item.serverId, serverName: item.serverName, chapelId: item.chapelId, chapelName: item.chapelName, serverType: item.serverType, origin: item.origin || "eligible", addedBy, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; }
async function addRosterMembers(formationId, poleId, members, addedBy) { await Promise.all(members.map((member) => setDoc(rosterRef(formationId, poleId, member.serverId), rosterPayload(member, addedBy)))); }
function removeRosterMember(formationId, poleId, serverId) { return deleteDoc(rosterRef(formationId, poleId, serverId)); }
export { addRosterMembers, getRoster, removeRosterMember, rosterPayload, subscribeToRoster };
