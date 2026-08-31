import { getCurrentUser } from "../../../session.js";
import { getFormations } from "./operational-formations.service.js";
import { getPoles } from "./pole.service.js";
import { getEncounters } from "./encounter.service.js";
import { activeOperationalFormations } from "./formation-lifecycle.logic.js";

function toMillis(value) {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function compareOperational(left, right) {
    const priority = { in_progress: 0, scheduled: 1, completed: 2, cancelled: 3 };
    return (priority[left.encounter.status] ?? 4) - (priority[right.encounter.status] ?? 4)
        || toMillis(left.encounter.startAt) - toMillis(right.encounter.startAt);
}

async function getOperationalEncounters(uid = getCurrentUser()?.uid) {
    if (!uid) return [];
    const formations = activeOperationalFormations(await getFormations());
    const contexts = [];
    for (const formation of formations) {
        const poles = await getPoles(formation.id);
        for (const pole of poles) {
            const encounters = await getEncounters(formation.id, pole.id);
            encounters.forEach((encounter) => {
                const designated = (encounter.coordinatorIds || []).includes(uid);
                const poleCoordinator = (pole.coordinatorIds || []).includes(uid);
                if (designated || poleCoordinator) contexts.push({ formation, pole, encounter, source: designated ? "designated" : "pole" });
            });
        }
    }
    return contexts.sort(compareOperational);
}

export { getOperationalEncounters, compareOperational, toMillis };
