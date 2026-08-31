import { db } from "../../../firebase.js";
import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const groups = collection(db, "formationGroups");
const toGroup = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });
const payload = (group) => ({ name: group.name, baseChapelId: group.baseChapelId, chapelIds: group.chapelIds, defaultCoordinatorIds: group.defaultCoordinatorIds || [], active: group.active === true });

async function getGroups() { return (await getDocs(query(groups, orderBy("name", "asc")))).docs.map(toGroup); }
async function createGroup(group) { const reference = doc(groups); await setDoc(reference, { ...payload(group), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); return reference.id; }
function updateGroup(groupId, group) { return updateDoc(doc(groups, groupId), { ...payload(group), updatedAt: serverTimestamp() }); }
function setGroupActive(groupId, active) { return updateDoc(doc(groups, groupId), { active, updatedAt: serverTimestamp() }); }

export { createGroup, getGroups, setGroupActive, updateGroup };
