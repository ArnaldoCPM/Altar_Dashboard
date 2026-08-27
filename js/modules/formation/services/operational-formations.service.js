import { db } from "../../../firebase.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

async function getFormations() {
    const snapshot = await getDocs(query(collection(db, "formations"), orderBy("createdAt", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export { getFormations };
