"use strict";

/**
 * One-shot, deliberately conservative backfill for the pastoral identity
 * directory. Dry-run is the default; --apply requires explicit project guards.
 */

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ID = "dashboard-servidores";
const BATCH_SIZE = 400;
const MANIFEST_DIRECTORY = path.join(__dirname, "backups");

function hasNonBlankText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPendingProfile(documentId, profile) {
  const uid = profile?.uid;
  return documentId.includes("@") && (uid === null || uid === undefined || uid === "");
}

function canonicalProjection(documentId, profile) {
  if (!profile || typeof profile.uid !== "string" || profile.uid.trim().length === 0 || profile.uid !== documentId) return null;
  if (!hasNonBlankText(profile.displayName)) return null;
  return { displayName: profile.displayName.trim() };
}

function isExactProjection(existing, projection) {
  return !!existing
    && Object.keys(existing).length === 1
    && existing.displayName === projection.displayName;
}

function redactDocumentId(documentId) {
  return documentId.includes("@") ? "[email-id omitted]" : documentId;
}

function classifyProfile({ id, data }, existingDirectory) {
  if (isPendingProfile(id, data)) return { action: "skip-pending", documentId: redactDocumentId(id) };

  const projection = canonicalProjection(id, data);
  if (!projection) return { action: "skip-invalid", documentId: redactDocumentId(id) };

  if (!existingDirectory) return { action: "create", uid: id, projection };
  if (isExactProjection(existingDirectory, projection)) return { action: "unchanged", uid: id, projection };
  return { action: "update", uid: id, projection };
}

function buildPlan(userDocuments, directoryByUid) {
  const entries = userDocuments.map((document) => classifyProfile(document, directoryByUid.get(document.id) || null));
  const counts = Object.fromEntries(["create", "update", "unchanged", "skip-invalid", "skip-pending"].map((key) => [key, 0]));
  entries.forEach((entry) => { counts[entry.action] += 1; });
  return { inspected: userDocuments.length, counts, entries };
}

function writeEntries(plan) {
  return plan.entries.filter((entry) => entry.action === "create" || entry.action === "update");
}

function chunk(entries, size = BATCH_SIZE) {
  const chunks = [];
  for (let index = 0; index < entries.length; index += size) chunks.push(entries.slice(index, index + size));
  return chunks;
}

function parseArguments(argv) {
  const options = { apply: false, project: null, confirmation: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--project") options.project = argv[++index];
    else if (arg === "--confirm-project") options.confirmation = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.project && options.project !== PROJECT_ID) throw new Error(`Project guard failed: expected ${PROJECT_ID}.`);
  if (options.apply && (options.project !== PROJECT_ID || options.confirmation !== PROJECT_ID)) {
    throw new Error(`Apply requires: --apply --project ${PROJECT_ID} --confirm-project ${PROJECT_ID}`);
  }
  return options;
}

function manifestEntry(entry) {
  if (entry.uid) return { action: entry.action, uid: entry.uid };
  return { action: entry.action, documentId: entry.documentId };
}

function createManifest(options, plan) {
  return {
    version: 1,
    projectId: PROJECT_ID,
    createdAt: new Date().toISOString(),
    mode: options.apply ? "apply" : "dry-run",
    inspected: plan.inspected,
    counts: plan.counts,
    actions: plan.entries.map(manifestEntry),
    execution: { completedBatches: [], failedBatch: null, revalidatedSkipped: 0 }
  };
}

function manifestPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(MANIFEST_DIRECTORY, `user-directory-backfill-${stamp}.json`);
}

function persistManifest(filePath, manifest) {
  fs.mkdirSync(MANIFEST_DIRECTORY, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function loadAdminDependencies() {
  const functionsDirectory = path.resolve(__dirname, "../../functions");
  return {
    adminApp: require(require.resolve("firebase-admin/app", { paths: [functionsDirectory] })),
    adminFirestore: require(require.resolve("firebase-admin/firestore", { paths: [functionsDirectory] }))
  };
}

function boot() {
  const { adminApp, adminFirestore } = loadAdminDependencies();
  const { applicationDefault, getApps, initializeApp } = adminApp;
  const existing = getApps()[0];
  const app = existing || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  if (app.options.projectId !== PROJECT_ID) {
    throw new Error(`Project guard failed: expected ${PROJECT_ID}, received ${app.options.projectId || "none"}.`);
  }
  return adminFirestore.getFirestore(app);
}

async function readDirectoryByUid(db, userDocuments) {
  const candidates = userDocuments.filter((document) => canonicalProjection(document.id, document.data));
  const directoryByUid = new Map();
  for (const group of chunk(candidates)) {
    const snapshots = await db.getAll(...group.map((document) => db.doc(`userDirectory/${document.id}`)));
    snapshots.forEach((snapshot) => directoryByUid.set(snapshot.id, snapshot.exists ? snapshot.data() : null));
  }
  return directoryByUid;
}

async function applyPlan(db, entries, manifest, filePath) {
  const batches = chunk(entries);
  for (let index = 0; index < batches.length; index += 1) {
    const plannedEntries = batches[index];
    const [users, directories] = await Promise.all([
      db.getAll(...plannedEntries.map((entry) => db.doc(`users/${entry.uid}`))),
      db.getAll(...plannedEntries.map((entry) => db.doc(`userDirectory/${entry.uid}`)))
    ]);
    const currentEntries = plannedEntries.flatMap((entry, itemIndex) => {
      const user = users[itemIndex];
      const directory = directories[itemIndex];
      const current = classifyProfile(
        { id: entry.uid, data: user.exists ? user.data() : undefined },
        directory.exists ? directory.data() : null
      );
      return current.action === "create" || current.action === "update" ? [current] : [];
    });
    const skippedAtApply = plannedEntries.length - currentEntries.length;
    manifest.execution.revalidatedSkipped += skippedAtApply;

    const batch = db.batch();
    currentEntries.forEach((entry) => batch.set(db.doc(`userDirectory/${entry.uid}`), entry.projection));
    try {
      if (currentEntries.length) await batch.commit();
      manifest.execution.completedBatches.push({ index: index + 1, operations: currentEntries.length, skippedAtApply });
      persistManifest(filePath, manifest);
    } catch (error) {
      manifest.execution.failedBatch = { index: index + 1, operations: currentEntries.length, skippedAtApply, message: error.message };
      persistManifest(filePath, manifest);
      throw error;
    }
  }
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const db = boot();
  const usersSnapshot = await db.collection("users").get();
  const userDocuments = usersSnapshot.docs.map((document) => ({ id: document.id, data: document.data() }));
  const directoryByUid = await readDirectoryByUid(db, userDocuments);
  const plan = buildPlan(userDocuments, directoryByUid);
  const manifest = createManifest(options, plan);
  const filePath = manifestPath();
  persistManifest(filePath, manifest);

  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Mode: ${manifest.mode}`);
  console.log(`Inspected: ${plan.inspected}`);
  console.log(`Counts: ${JSON.stringify(plan.counts)}`);
  console.log(`Manifest: ${filePath}`);

  if (!options.apply) {
    console.log("Dry-run complete. No Firestore writes were attempted.");
    return manifest;
  }

  const entries = writeEntries(plan);
  await applyPlan(db, entries, manifest, filePath);
  console.log(`Apply complete. Batches committed: ${manifest.execution.completedBatches.length}.`);
  return manifest;
}

if (require.main === module) {
  main().catch((error) => {
    console.error("BACKFILL STOPPED:", error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  BATCH_SIZE,
  PROJECT_ID,
  buildPlan,
  canonicalProjection,
  chunk,
  classifyProfile,
  createManifest,
  isExactProjection,
  parseArguments,
  writeEntries
};
