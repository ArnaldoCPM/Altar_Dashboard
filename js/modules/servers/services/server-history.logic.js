const OPERATIONAL_STATUSES = new Set(["in_progress", "completed"]);
const REGISTERED_ATTENDANCE = new Set(["present", "absent", "justified"]);

function timestampMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function participantContextFromPath(path) {
  const parts = String(path || "").split("/");
  if (parts.length !== 8 || parts[0] !== "formations" || parts[2] !== "poles" || parts[4] !== "encounters" || parts[6] !== "participants") return null;
  return { formationId: parts[1], poleId: parts[3], encounterId: parts[5] };
}

function sortByStartAtDesc(items) {
  return [...items].sort((left, right) => (timestampMillis(right.encounter?.startAt) ?? -Infinity) - (timestampMillis(left.encounter?.startAt) ?? -Infinity));
}

function summarizeHistory(items) {
  const operational = items.filter((item) => OPERATIONAL_STATUSES.has(item.encounter?.status));
  const attendance = { present: 0, absent: 0, justified: 0, pending: 0 };
  operational.forEach((item) => { if (Object.hasOwn(attendance, item.participant.attendanceStatus || "pending")) attendance[item.participant.attendanceStatus || "pending"] += 1; });
  const attended = operational.filter((item) => REGISTERED_ATTENDANCE.has(item.participant.attendanceStatus));
  const latestParticipation = sortByStartAtDesc(attended)[0] || null;
  return {
    formationCount: new Set(operational.map((item) => item.formation?.id).filter(Boolean)).size,
    encounterCount: operational.length,
    ...attendance,
    latestParticipation,
  };
}

function categorizeHistory(items) {
  const sorted = sortByStartAtDesc(items);
  return {
    upcoming: sorted.filter((item) => item.encounter?.status === "scheduled"),
    historical: sorted.filter((item) => OPERATIONAL_STATUSES.has(item.encounter?.status)),
    cancelled: sorted.filter((item) => item.encounter?.status === "cancelled"),
  };
}

async function mapConcurrent(items, mapper, concurrency = 6) {
  const results = new Array(items.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor++; results[index] = await mapper(items[index]); }
  }));
  return results;
}

/**
 * Traverses the canonical hierarchy once. Each encounter reads only this
 * server's participant document; it never downloads another server's roster.
 */
async function collectServerHistoryFromHierarchy(serverId, source, concurrency = 6) {
  const formations = await source.listFormations();
  const polesByFormation = await mapConcurrent(formations, async (formation) => ({ formation, poles: await source.listPoles(formation.id) }), concurrency);
  const contexts = (await mapConcurrent(polesByFormation.flatMap(({ formation, poles }) => poles.map((pole) => ({ formation, pole }))), async ({ formation, pole }) => {
    const encounters = await source.listEncounters(formation.id, pole.id);
    return encounters.map((encounter) => ({ formation, pole, encounter }));
  }, concurrency)).flat();
  const candidates = await mapConcurrent(contexts, async (context) => {
    const participant = await source.getParticipant(context.formation.id, context.pole.id, context.encounter.id, serverId);
    return participant ? { ...context, participant, contextAvailable: true } : null;
  }, concurrency);
  return candidates.filter(Boolean);
}

export { participantContextFromPath, timestampMillis, sortByStartAtDesc, summarizeHistory, categorizeHistory, mapConcurrent, collectServerHistoryFromHierarchy };
