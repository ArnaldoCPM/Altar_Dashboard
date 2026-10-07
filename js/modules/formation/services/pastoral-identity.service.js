import { db } from "../../../firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { createPastoralIdentityResolver } from "./pastoral-identity.logic.js";

const resolver = createPastoralIdentityResolver(async (uid) => {
    const snapshot = await getDoc(doc(db, "userDirectory", uid));
    return snapshot.exists() ? snapshot.data() : null;
});

function resolvePastoralIdentityNames(responsibilities) {
    return resolver.resolveResponsibilities(responsibilities);
}

export { resolvePastoralIdentityNames };
