import { onSnapshot } from "../../../firebase.js";
import { buildServersQuery } from "../../../serverQuery.js";

function subscribeToDashboardData(db, onData, onError) {
    return onSnapshot(buildServersQuery(db), (snapshot) => {
        const data = [];

        snapshot.forEach((documentSnapshot) => {
            data.push({
                id: documentSnapshot.id,
                Id: documentSnapshot.id,
                ...documentSnapshot.data()
            });
        });

        onData(data);
    }, onError);
}

export { subscribeToDashboardData };
