import { db } from "../../../firebase.js";
import { collection, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { categorizeHistory, collectServerHistoryFromHierarchy, summarizeHistory } from "./server-history.logic.js";

const CONCURRENCY = 6;
const asData = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

const source = {
  async listFormations() { return (await getDocs(collection(db, "formations"))).docs.map(asData); },
  async listPoles(formationId) { return (await getDocs(collection(db, "formations", formationId, "poles"))).docs.map(asData); },
  async listEncounters(formationId, poleId) { return (await getDocs(collection(db, "formations", formationId, "poles", poleId, "encounters"))).docs.map(asData); },
  async getParticipant(formationId, poleId, encounterId, serverId) {
    const snapshot = await getDoc(doc(db, "formations", formationId, "poles", poleId, "encounters", encounterId, "participants", serverId));
    return snapshot.exists() ? asData(snapshot) : null;
  },
};

function cachedSource(base) {
  const cache = new Map();
  const once = (key, read) => {
    if (!cache.has(key)) cache.set(key, read());
    return cache.get(key);
  };
  return {
    listFormations: () => once("formations", () => base.listFormations()),
    listPoles: (formationId) => once(`poles/${formationId}`, () => base.listPoles(formationId)),
    listEncounters: (formationId, poleId) => once(`encounters/${formationId}/${poleId}`, () => base.listEncounters(formationId, poleId)),
    getParticipant: (formationId, poleId, encounterId, serverId) => once(`participant/${formationId}/${poleId}/${encounterId}/${serverId}`, () => base.getParticipant(formationId, poleId, encounterId, serverId)),
  };
}

async function loadServerHistory(serverId) {
  if (!serverId) throw new Error("É necessário informar o servidor.");
  const items = await collectServerHistoryFromHierarchy(serverId, cachedSource(source), CONCURRENCY);
  return { items, sections: categorizeHistory(items), summary: summarizeHistory(items) };
}

export { loadServerHistory };
