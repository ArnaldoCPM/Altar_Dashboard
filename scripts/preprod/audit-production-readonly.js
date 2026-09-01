"use strict";

/**
 * SGSA production data audit. It deliberately performs Firestore reads only.
 * It is fixed to the production project and the deployed server namespace.
 *
 * Authentication is intentionally external to this file: Firebase Admin does
 * not automatically reuse `firebase login`. Use only credentials already
 * available to the local environment (ADC or GOOGLE_APPLICATION_CREDENTIALS).
 */

const path = require("node:path");
const functionsDirectory = path.resolve(__dirname, "../../functions");
const adminApp = require(require.resolve("firebase-admin/app", { paths: [functionsDirectory] }));
const adminFirestore = require(require.resolve("firebase-admin/firestore", { paths: [functionsDirectory] }));

const PROJECT_ID = "dashboard-servidores";
const APP_ID = "default-app-id";
const SERVER_ROOT = `artifacts/${APP_ID}/public/data/servers`;
const SAMPLE_LIMIT = 25;
const LEVELS = ["BLOCKER", "NEEDS_MIGRATION_BEFORE_EDIT", "PASTORAL_REVIEW", "INFORMATIONAL"];

const { applicationDefault, getApps, initializeApp } = adminApp;
const { getFirestore } = adminFirestore;

function boot() {
  const existing = getApps()[0];
  const app = existing || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  if (app.options.projectId !== PROJECT_ID) {
    throw new Error(`Project guard failed: expected ${PROJECT_ID}, received ${app.options.projectId || "none"}.`);
  }
  return getFirestore(app);
}

function maskEmail(value) {
  const at = String(value).indexOf("@");
  if (at < 1) return "[non-email id]";
  return `${String(value)[0]}***@${String(value).slice(at + 1)}`;
}

function newArea(name) {
  return { name, total: 0, flagged: [], findings: Object.fromEntries(LEVELS.map((level) => [level, []])), metrics: {} };
}

function finding(area, level, id, reason) {
  if (!area.flagged.includes(id)) area.flagged.push(id);
  if (area.findings[level].length < SAMPLE_LIMIT) area.findings[level].push({ id, reason });
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizedEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function emptyUid(value) {
  return value === null || value === undefined || value === "";
}

function validAccessProfile(profile) {
  if (!profile || profile.active !== true || !["admin", "coordinator", "viewer"].includes(profile.role)) return false;
  return profile.role === "admin" || hasText(profile.chapelId);
}

function countMetric(area, key) {
  area.metrics[key] = (area.metrics[key] || 0) + 1;
}

function collection(parent, name) {
  return parent ? parent.collection(name) : null;
}

async function inspectUsers(db, areas) {
  const area = areas.users;
  const snap = await db.collection("users").get();
  area.total = snap.size;
  const profiles = snap.docs.map((doc) => ({ doc, data: doc.data(), email: normalizedEmail(doc.data().email) }));
  const canonicalByEmail = {};
  for (const profile of profiles) {
    if (hasText(profile.data.uid) && profile.data.uid === profile.doc.id && profile.email) {
      const current = canonicalByEmail[profile.email] || [];
      current.push(profile.doc.id);
      canonicalByEmail[profile.email] = current;
    }
  }
  for (const { doc, data, email } of profiles) {
    const id = doc.id.includes("@") ? maskEmail(doc.id) : doc.id;
    if (!hasText(data.role)) finding(area, "BLOCKER", id, "missing role");
    if (data.active !== undefined && typeof data.active !== "boolean") finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", id, "active is not boolean");
    if (hasText(data.uid) && data.uid !== doc.id) finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", id, "stored uid does not match document id");

    const idEmail = normalizedEmail(doc.id);
    const isEmailId = idEmail.includes("@");
    const isPending = isEmailId && emptyUid(data.uid);
    if (isEmailId && !isPending) {
      finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", id, "email-keyed document has a populated uid");
    } else if (isPending) {
      const pendingEmail = email || idEmail;
      const canonical = canonicalByEmail[pendingEmail] || [];
      if (email && email !== idEmail) finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", id, "pending email field conflicts with its email document id");
      else if (canonical.length) finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", id, "pending profile has canonical profile(s) for the same email");
      else if (!validAccessProfile(data) && data.active !== false) finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", id, "pending profile is not eligible for M15 access");
      else if (data.active === false) countMetric(area, "pending_inactive_authorized_state");
      else countMetric(area, "pending_normal_no_conflict");
    }

    const activeLabel = data.active === undefined ? "missing" : String(data.active);
    const statusLabel = hasText(data.status) ? data.status : "missing";
    countMetric(area, `active=${activeLabel};status=${statusLabel}`);
    if (data.status !== undefined && !["pending", "active", "disabled"].includes(data.status)) {
      finding(area, "INFORMATIONAL", id, "unrecognized legacy status; current authorization uses active");
    }
  }
}

async function inspectChapels(db, areas) {
  const area = areas.chapels;
  const snap = await db.collection("chapels").get();
  area.total = snap.size;
  snap.forEach((doc) => {
    const data = doc.data();
    if (!hasText(data.name || data.nome)) finding(area, "BLOCKER", doc.id, "missing chapel name");
    if (data.active !== undefined && typeof data.active !== "boolean") finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", doc.id, "active is not boolean");
  });
}

async function inspectServers(db, areas) {
  const area = areas.servers;
  const snap = await db.collection(SERVER_ROOT).get();
  area.total = snap.size;
  snap.forEach((doc) => {
    const data = doc.data();
    if (!hasText(data.chapelId)) finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", doc.id, "missing chapelId");
    if (!hasText(data.Capela || data.capela)) finding(area, "INFORMATIONAL", doc.id, "legacy Capela label absent");
    if (data.Idade !== undefined) finding(area, "INFORMATIONAL", doc.id, "legacy Idade fallback remains; Data_nascimento is canonical");
    if (data.active !== undefined && typeof data.active !== "boolean") finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", doc.id, "active is not boolean");
  });
}

async function inspectFormationCollection(ref, area, inspect) {
  const snap = await ref.get();
  area.total += snap.size;
  for (const doc of snap.docs) await inspect(doc, area);
}

async function inspectFormations(db, areas) {
  const area = areas.formations;
  const formations = await db.collection("formations").get();
  area.total = formations.size;
  for (const formation of formations.docs) {
    const data = formation.data();
    const status = data.status || "legacy/missing";
    if (!["draft", "active", "completed", "archived"].includes(status)) finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", formation.id, `unexpected lifecycle status: ${status}`);
    if (data.status === "archived" && data.active === true) finding(area, "BLOCKER", formation.id, "archived formation marked active");
    if (!hasText(data.name || data.nome || data.title)) finding(area, "BLOCKER", formation.id, "missing formation name");

    const groups = collection(formation.ref, "groups");
    const groupSnap = await groups.get();
    areas.formationGroups.total += groupSnap.size;
    for (const group of groupSnap.docs) {
      const groupData = group.data();
      const groupId = `${formation.id}/${group.id}`;
      if (groupData.formationId && groupData.formationId !== formation.id) finding(areas.formationGroups, "BLOCKER", groupId, "formationId does not match parent");
      if (!hasText(groupData.name || groupData.nome)) finding(areas.formationGroups, "NEEDS_MIGRATION_BEFORE_EDIT", groupId, "missing group name");

      const roster = await group.ref.collection("roster").get();
      areas.roster.total += roster.size;
      roster.forEach((member) => {
        const memberData = member.data();
        if (!hasText(memberData.serverId || member.id)) finding(areas.roster, "BLOCKER", `${groupId}/${member.id}`, "missing server reference");
      });

      const encounters = await group.ref.collection("encounters").get();
      areas.encounters.total += encounters.size;
      for (const encounter of encounters.docs) {
        const encounterData = encounter.data();
        const encounterId = `${groupId}/${encounter.id}`;
        if (!["scheduled", "in_progress", "completed", "cancelled"].includes(encounterData.status)) finding(areas.encounters, "NEEDS_MIGRATION_BEFORE_EDIT", encounterId, "unexpected or missing encounter status");

        const participants = await encounter.ref.collection("participants").get();
        areas.participants.total += participants.size;
        participants.forEach((participant) => {
          const participantData = participant.data();
          if (!hasText(participantData.serverId || participant.id)) finding(areas.participants, "BLOCKER", `${encounterId}/${participant.id}`, "missing server reference");
        });

        const attendance = await encounter.ref.collection("attendance").get();
        areas.attendance.total += attendance.size;
        attendance.forEach((record) => {
          const recordData = record.data();
          if (!hasText(recordData.serverId || record.id)) finding(areas.attendance, "BLOCKER", `${encounterId}/${record.id}`, "missing server reference");
        });
      }
    }
  }
}

async function inspectCatalogAndGroups(db, areas) {
  const candidates = ["formationCatalog", "criteriaCatalog", "poles", "formationGroups"];
  for (const name of candidates) {
    const area = areas[name];
    try {
      const snap = await db.collection(name).get();
      area.total = snap.size;
      snap.forEach((doc) => {
        const data = doc.data();
        if (name === "formationGroups" && !hasText(data.formationId)) finding(area, "NEEDS_MIGRATION_BEFORE_EDIT", doc.id, "top-level group lacks formationId");
      });
    } catch (error) {
      finding(area, "INFORMATIONAL", "collection", `not readable or not present: ${error.code || error.message}`);
    }
  }
}

function printArea(area) {
  const correct = Math.max(0, area.total - area.flagged.length);
  console.log(`\n[${area.name}] documents=${area.total}; unflagged=${correct}`);
  Object.entries(area.metrics).sort(([left], [right]) => left.localeCompare(right)).forEach(([key, count]) => {
    console.log(`  metric ${key}: ${count}`);
  });
  for (const level of LEVELS) {
    const entries = area.findings[level];
    if (!entries.length) continue;
    console.log(`  ${level}: ${entries.length}${entries.length === SAMPLE_LIMIT ? "+" : ""}`);
    entries.forEach((entry) => console.log(`    - ${entry.id}: ${entry.reason}`));
  }
}

async function main() {
  console.log("=== SGSA PRE-PROD READ-ONLY AUDIT ===");
  console.log("READ-ONLY PRODUCTION AUDIT");
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Server namespace: ${SERVER_ROOT}`);
  console.log("NO WRITES WILL BE PERFORMED");

  const db = boot();
  const areas = Object.fromEntries([
    "users", "chapels", "servers", "formations", "formationGroups", "roster", "encounters", "participants", "attendance",
    "formationCatalog", "criteriaCatalog", "poles",
  ].map((name) => [name, newArea(name)]));

  await inspectUsers(db, areas);
  await inspectChapels(db, areas);
  await inspectServers(db, areas);
  await inspectFormations(db, areas);
  await inspectCatalogAndGroups(db, areas);

  console.log("\n=== SUMMARY ===");
  console.log("[users schema] active boolean is authoritative for login, Rules, UI and M15 eligibility.");
  console.log("[users schema] status is tolerated metadata: new pending=email profile, M15 consolidation=active, disable=disabled.");
  console.log("[users schema] active/status combinations are metrics, not automatic pastoral findings.");
  Object.values(areas).forEach(printArea);
  console.log("\nClassification: BLOCKER | NEEDS_MIGRATION_BEFORE_EDIT | PASTORAL_REVIEW | INFORMATIONAL");
  console.log("Audit complete. Output intentionally omits names, contacts, health information, and full email addresses.");
}

main().catch((error) => {
  console.error("AUDIT STOPPED:", error.code || error.name, error.message);
  console.error("No Firestore write was attempted.");
  process.exitCode = 1;
});
