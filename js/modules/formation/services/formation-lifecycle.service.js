import { getPoles } from "./pole.service.js";
import { getEncounters } from "./encounter.service.js";
import { activeOperationalFormations, canCompleteWithEncounterCounts, completionBlockMessage, encounterStatusCounts } from "./formation-lifecycle.logic.js";

async function getFormationEncounterStatusCounts(formationId) {
    const poles = await getPoles(formationId);
    const encounters = (await Promise.all(poles.map((pole) => getEncounters(formationId, pole.id)))).flat();
    return encounterStatusCounts(encounters);
}

export { activeOperationalFormations, canCompleteWithEncounterCounts, completionBlockMessage, encounterStatusCounts, getFormationEncounterStatusCounts };
