const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  Timestamp,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} = require('firebase/firestore');

const PROJECT_ID = 'sgsa-formation-rules-tests';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [host, portValue] = EMULATOR_HOST.split(':');
const port = Number(portValue || 8080);

const users = {
  admin: { uid: 'admin-uid', email: 'admin@example.test', role: 'admin', active: true, chapelId: 'chapel-a' },
  coordinator: { uid: 'coordinator-uid', email: 'coordinator@example.test', role: 'coordinator', active: true, chapelId: 'chapel-a' },
  unassignedCoordinator: { uid: 'unassigned-coordinator-uid', email: 'coordinator.unassigned@example.test', role: 'coordinator', active: true, chapelId: 'chapel-b' },
  substitute: { uid: 'substitute-uid', email: 'substitute@example.test', role: 'coordinator', active: true, chapelId: 'chapel-b' },
  viewer: { uid: 'viewer-uid', email: 'viewer@example.test', role: 'viewer', active: true, chapelId: 'chapel-a' },
  inactive: { uid: 'inactive-uid', email: 'inactive@example.test', role: 'admin', active: false, chapelId: 'chapel-a' },
};

let testEnv;

function dbFor(user) {
  return user
    ? testEnv.authenticatedContext(user.uid, { email: user.email }).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

function formationRef(db, id = 'formation-1') {
  return doc(db, 'formations', id);
}

function validFormation(overrides = {}) {
  return {
    name: 'Formation Alpha',
    description: 'Formation de prueba',
    stage: 'first',
    modalities: ['initial'],
    startDate: Timestamp.fromDate(new Date('2026-01-10T00:00:00.000Z')),
    endDate: Timestamp.fromDate(new Date('2026-01-11T00:00:00.000Z')),
    referenceDate: Timestamp.fromDate(new Date('2026-01-10T00:00:00.000Z')),
    eligibilityCriteria: { minAge: 6, maxAge: 11, serverTypes: ['Candidato', 'Formando'] },
    status: 'draft',
    createdBy: users.admin.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function poleRef(db, formationId = 'formation-1', poleId = 'pole-1') {
  return doc(db, 'formations', formationId, 'poles', poleId);
}

function validPole(overrides = {}) {
  return {
    name: 'Polo Centro',
    baseChapelId: 'chapel-a',
    chapelIds: ['chapel-a', 'chapel-b'],
    coordinatorIds: [users.coordinator.uid],
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function encounterRef(db, formationId = 'formation-1', poleId = 'pole-1', encounterId = 'encounter-1') {
  return doc(db, 'formations', formationId, 'poles', poleId, 'encounters', encounterId);
}
function participantRef(db, serverId = 'server-1', encounterId = 'encounter-1') { return doc(db, 'formations', 'formation-1', 'poles', 'pole-1', 'encounters', encounterId, 'participants', serverId); }
function exclusionRef(db, serverId = 'server-1', encounterId = 'encounter-1') { return doc(db, 'formations', 'formation-1', 'poles', 'pole-1', 'encounters', encounterId, 'participantExclusions', serverId); }
function rosterRef(db, serverId = 'server-1') { return doc(db, 'formations', 'formation-1', 'poles', 'pole-1', 'roster', serverId); }
function chapelRef(db, id = 'chapel-a') { return doc(db, 'chapels', id); }
function serverRef(db, id = 'server-1') { return doc(db, 'artifacts', 'default-app-id', 'public', 'data', 'servers', id); }
function validChapel(overrides = {}) { return { name: 'Capela São José', active: true, address: 'Rua Central', notes: 'Uso administrativo.', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...overrides }; }
const RENAME_TEST_BATCH_SIZE = 2;

async function renameChapelAndSyncServerNames(db, chapelId, name) {
  const servers = await getDocs(query(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'servers'), where('chapelId', '==', chapelId)));
  let completed = 0;
  for (let offset = 0; offset < servers.docs.length; offset += RENAME_TEST_BATCH_SIZE) {
    const batch = writeBatch(db);
    servers.docs.slice(offset, offset + RENAME_TEST_BATCH_SIZE).forEach((server) => batch.update(server.ref, { Capela: name }));
    await batch.commit();
    completed += Math.min(RENAME_TEST_BATCH_SIZE, servers.docs.length - offset);
  }
  await updateDoc(chapelRef(db, chapelId), { name, address: '', notes: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return completed;
}
function validParticipant(overrides = {}) { return { serverId: 'server-1', serverName: 'Servidor', chapelId: 'chapel-a', chapelName: 'Capela A', participationType: 'regular', attendanceStatus: 'pending', addedManually: false, addedBy: users.admin.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...overrides }; }
function validExclusion(overrides = {}) { return { serverId: 'server-1', excludedBy: users.admin.uid, createdAt: serverTimestamp(), ...overrides }; }
function validRoster(overrides = {}) { return { serverId: 'server-1', serverName: 'Servidor', chapelId: 'chapel-a', chapelName: 'Capela A', serverType: 'Formando', origin: 'eligible', addedBy: users.admin.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...overrides }; }

test('roster: admin manages, active roles read, and others cannot write', async () => {
  await seedFormation(); await seedPole();
  await assertSucceeds(setDoc(rosterRef(dbFor(users.admin)), validRoster()));
  await assertSucceeds(getDoc(rosterRef(dbFor(users.coordinator))));
  await assertSucceeds(getDoc(rosterRef(dbFor(users.viewer))));
  await assertFails(setDoc(rosterRef(dbFor(users.coordinator), 'server-2'), validRoster({ serverId: 'server-2' })));
  await assertFails(updateDoc(rosterRef(dbFor(users.viewer)), { serverName: 'Alterado', updatedAt: serverTimestamp() }));
  await assertFails(getDoc(rosterRef(dbFor(users.inactive))));
  await assertFails(getDoc(rosterRef(dbFor(null))));
});

function validEncounter(overrides = {}) {
  return {
    title: 'Encontro de formação', description: '',
    startAt: Timestamp.fromDate(new Date('2026-03-10T10:00:00.000Z')),
    location: { chapelId: 'chapel-a', name: 'Capela A' }, status: 'scheduled',
    coordinatorIds: [users.coordinator.uid],
    responsibilities: [{ userId: users.coordinator.uid, type: 'designated', status: 'confirmed' }],
    createdBy: users.admin.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...overrides,
  };
}

async function seedEncounter(overrides = {}) {
  await seedPole();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(encounterRef(context.firestore()), { ...validEncounter(overrides), createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')), updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')) });
  });
}

async function seedParticipant(overrides = {}, encounter = {}) {
  await seedEncounter(encounter);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(participantRef(context.firestore(), overrides.serverId || 'server-1', encounter.id || 'encounter-1'), {
      ...validParticipant(overrides),
      createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
    });
  });
}

async function seedUsers() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(Object.values(users).map((user) => setDoc(doc(db, 'users', user.uid), user)));
  });
}

async function seedFormation(status = 'draft', id = 'formation-1') {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'formations', id), {
      ...validFormation({ status }),
      createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
    });
  });
}

async function seedPole(overrides = {}, formationId = 'formation-1', poleId = 'pole-1') {
  await seedFormation('draft', formationId);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(poleRef(context.firestore(), formationId, poleId), {
      ...validPole(overrides),
      createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
    });
  });
}

test.before(async () => {
  const rules = await readFile('../../firestore.rules', 'utf8');
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules, host, port } });
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedUsers();
});

test.after(async () => {
  await testEnv?.cleanup();
});

test('chapels: active authenticated roles can read, but only admin can create', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => setDoc(chapelRef(context.firestore()), { name: 'Capela A', active: true }));
  await assertSucceeds(getDoc(chapelRef(dbFor(users.viewer))));
  await assertSucceeds(setDoc(chapelRef(dbFor(users.admin), 'chapel-create'), validChapel()));
  await assertFails(setDoc(chapelRef(dbFor(users.coordinator), 'chapel-forbidden'), validChapel()));
});

test('chapels: schema and server timestamps are required on create', async () => {
  await assertFails(setDoc(chapelRef(dbFor(users.admin), 'chapel-invalid'), validChapel({ notes: 'x'.repeat(501) })));
  await assertFails(setDoc(chapelRef(dbFor(users.admin), 'chapel-invalid-time'), { name: 'Capela X', active: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }));
});

test('chapels: legacy document can be updated and receive its first createdAt safely', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => setDoc(chapelRef(context.firestore(), 'chapel-legacy'), { name: 'Capela Legacy', active: true }));
  await assertSucceeds(updateDoc(chapelRef(dbFor(users.admin), 'chapel-legacy'), { address: 'Rua antiga', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});

test('chapels: legacy redundant id matching the document remains updateable', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => setDoc(chapelRef(context.firestore(), 'chapel-legacy-id'), { id: 'chapel-legacy-id', name: 'Capela Legacy', active: true }));
  await assertSucceeds(updateDoc(chapelRef(dbFor(users.admin), 'chapel-legacy-id'), { name: 'Capela Atualizada', address: '', notes: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});

test('chapels: a redundant id different from the document remains rejected', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => setDoc(chapelRef(context.firestore(), 'chapel-wrong-id'), { id: 'another-id', name: 'Capela Legacy', active: true }));
  await assertFails(updateDoc(chapelRef(dbFor(users.admin), 'chapel-wrong-id'), { name: 'Capela Atualizada', address: '', notes: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});

test('chapels: delete is rejected for admin', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => setDoc(chapelRef(context.firestore(), 'chapel-delete'), { name: 'Capela A', active: true }));
  await assertFails(deleteDoc(chapelRef(dbFor(users.admin), 'chapel-delete')));
});

test('chapels: admin rename workflow updates linked servers without touching historical snapshots', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(chapelRef(db, 'chapel-rename'), { name: 'Capela Antiga', active: true });
    await setDoc(serverRef(db, 'server-rename'), { chapelId: 'chapel-rename', Capela: 'Capela Antiga' });
    await setDoc(doc(db, 'history', 'snapshot-1'), { chapelId: 'chapel-rename', chapelName: 'Capela Antiga' });
  });
  const db = dbFor(users.admin);
  const batch = writeBatch(db);
  batch.update(serverRef(db, 'server-rename'), { Capela: 'Capela Nova' });
  batch.update(chapelRef(db, 'chapel-rename'), { name: 'Capela Nova', address: '', notes: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await assertSucceeds(batch.commit());
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const raw = context.firestore();
    assert.equal((await getDoc(serverRef(raw, 'server-rename'))).data().Capela, 'Capela Nova');
    assert.equal((await getDoc(doc(raw, 'history', 'snapshot-1'))).data().chapelName, 'Capela Antiga');
  });
});

test('chapels: sequential rename completes with 0, 1, 2, and multiple linked servers only', async () => {
  const db = dbFor(users.admin);
  for (const total of [0, 1, 2, 5]) {
    const chapelId = `chapel-sequential-${total}`;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const raw = context.firestore();
      await setDoc(chapelRef(raw, chapelId), { name: `Capela Antiga ${total}`, active: true });
      await Promise.all(Array.from({ length: total }, (_, index) => setDoc(serverRef(raw, `linked-${total}-${index}`), { chapelId, Capela: `Capela Antiga ${total}` })));
      await setDoc(serverRef(raw, `unlinked-${total}`), { chapelId: 'another-chapel', Capela: 'Outra Capela' });
      await setDoc(doc(raw, 'history', `snapshot-${total}`), { chapelId, chapelName: `Capela Antiga ${total}` });
    });

    const name = `Capela Nova ${total}`;
    assert.equal(await renameChapelAndSyncServerNames(db, chapelId, name), total);
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const raw = context.firestore();
      assert.equal((await getDoc(chapelRef(raw, chapelId))).data().name, name);
      for (let index = 0; index < total; index += 1) assert.equal((await getDoc(serverRef(raw, `linked-${total}-${index}`))).data().Capela, name);
      assert.equal((await getDoc(serverRef(raw, `unlinked-${total}`))).data().Capela, 'Outra Capela');
      assert.equal((await getDoc(doc(raw, 'history', `snapshot-${total}`))).data().chapelName, `Capela Antiga ${total}`);
    });
  }
});

test('admin can read formations', async () => {
  await seedFormation();
  await assertSucceeds(getDocs(collection(dbFor(users.admin), 'formations')));
});

test('admin can create a valid draft with server timestamps', async () => {
  await assertSucceeds(setDoc(formationRef(dbFor(users.admin), 'create-server-time'), validFormation()));
});

test('serverTimestamp values satisfy request.time on create', async () => {
  const db = dbFor(users.admin);
  const ref = formationRef(db, 'server-timestamp-proof');
  await assertSucceeds(setDoc(ref, validFormation()));
  await assertSucceeds(getDoc(ref));
});

test('admin can update a valid formation', async () => {
  await seedFormation();
  await assertSucceeds(updateDoc(formationRef(dbFor(users.admin)), { name: 'Formation Beta', updatedAt: serverTimestamp() }));
});

for (const [from, to] of [
  ['draft', 'active'], ['active', 'completed'], ['active', 'archived'],
  ['completed', 'archived'], ['draft', 'archived'], ['active', 'active'], ['archived', 'archived'],
]) {
  test(`admin permits status transition ${from} → ${to}`, async () => {
    await seedFormation(from);
    await assertSucceeds(updateDoc(formationRef(dbFor(users.admin)), { status: to, updatedAt: serverTimestamp() }));
  });
}

for (const [from, to] of [
  ['draft', 'completed'], ['active', 'draft'], ['completed', 'active'],
  ['completed', 'draft'], ['archived', 'active'], ['archived', 'completed'],
]) {
  test(`admin rejects invalid status transition ${from} → ${to}`, async () => {
    await seedFormation(from);
    await assertFails(updateDoc(formationRef(dbFor(users.admin)), { status: to, updatedAt: serverTimestamp() }));
  });
}

for (const role of ['coordinator', 'viewer']) {
  test(`${role} can read formations`, async () => {
    await seedFormation();
    await assertSucceeds(getDocs(collection(dbFor(users[role]), 'formations')));
  });

  test(`${role} cannot create a formation`, async () => {
    await assertFails(setDoc(formationRef(dbFor(users[role]), `${role}-create`), validFormation({ createdBy: users[role].uid })));
  });

  test(`${role} cannot update a formation or change status`, async () => {
    await seedFormation();
    const db = dbFor(users[role]);
    await assertFails(updateDoc(formationRef(db), { name: 'Denied', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(formationRef(db), { status: 'active', updatedAt: serverTimestamp() }));
  });
}

test('inactive user cannot read, create, or update formations', async () => {
  await seedFormation();
  const db = dbFor(users.inactive);
  await assertFails(getDocs(collection(db, 'formations')));
  await assertFails(setDoc(formationRef(db, 'inactive-create'), validFormation({ createdBy: users.inactive.uid })));
  await assertFails(updateDoc(formationRef(db), { name: 'Denied', updatedAt: serverTimestamp() }));
});

test('unauthenticated user cannot read or create formations', async () => {
  await seedFormation();
  const db = dbFor();
  await assertFails(getDocs(collection(db, 'formations')));
  await assertFails(setDoc(formationRef(db, 'anonymous-create'), validFormation()));
});

const invalidSchemas = [
  ['name is missing', (data) => { delete data.name; }],
  ['stage is missing', (data) => { delete data.stage; }],
  ['modalities is missing', (data) => { delete data.modalities; }],
  ['status is missing', (data) => { delete data.status; }],
  ['createdBy is missing', (data) => { delete data.createdBy; }],
  ['createdAt is missing', (data) => { delete data.createdAt; }],
  ['updatedAt is missing', (data) => { delete data.updatedAt; }],
  ['an unexpected field exists', (data) => { data.unexpected = true; }],
  ['name is not a string', (data) => { data.name = 42; }],
  ['stage is invalid', (data) => { data.stage = 'third'; }],
  ['modalities is not a list', (data) => { data.modalities = 'initial'; }],
  ['modalities is empty', (data) => { data.modalities = []; }],
  ['modalities contains an invalid value', (data) => { data.modalities = ['invalid']; }],
  ['status is invalid', (data) => { data.status = 'invalid'; }],
  ['startDate is not a timestamp', (data) => { data.startDate = '2026-01-10'; }],
  ['endDate is not a timestamp', (data) => { data.endDate = '2026-01-11'; }],
  ['endDate precedes startDate', (data) => {
    data.startDate = Timestamp.fromDate(new Date('2026-01-11T00:00:00.000Z'));
    data.endDate = Timestamp.fromDate(new Date('2026-01-10T00:00:00.000Z'));
  }],
];

for (const [description, invalidate] of invalidSchemas) {
  test(`schema rejects creation when ${description}`, async () => {
    const data = validFormation();
    invalidate(data);
    await assertFails(setDoc(formationRef(dbFor(users.admin), `invalid-${description.replace(/[^a-z]/gi, '-')}`), data));
  });
}

test('admin cannot alter createdBy during an update', async () => {
  await seedFormation();
  await assertFails(updateDoc(formationRef(dbFor(users.admin)), { createdBy: 'another-user', updatedAt: serverTimestamp() }));
});

test('admin cannot alter createdAt during an update', async () => {
  await seedFormation();
  await assertFails(updateDoc(formationRef(dbFor(users.admin)), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});

test('admin update requires updatedAt to be request.time', async () => {
  await seedFormation();
  await assertFails(updateDoc(formationRef(dbFor(users.admin)), {
    name: 'Wrong audit timestamp',
    updatedAt: Timestamp.fromDate(new Date('2000-01-01T00:00:00.000Z')),
  }));
});

test('partial status update evaluates the resulting document and accepts valid data', async () => {
  await seedFormation('draft');
  await assertSucceeds(updateDoc(formationRef(dbFor(users.admin)), { status: 'active', updatedAt: serverTimestamp() }));
});

test('partial status update rejects an invalid transition', async () => {
  await seedFormation('draft');
  await assertFails(updateDoc(formationRef(dbFor(users.admin)), { status: 'completed', updatedAt: serverTimestamp() }));
});

test('admin can read poles', async () => {
  await seedPole();
  await assertSucceeds(getDocs(collection(dbFor(users.admin), 'formations', 'formation-1', 'poles')));
});

test('admin can create a valid pole with server timestamps', async () => {
  await seedFormation();
  await assertSucceeds(setDoc(poleRef(dbFor(users.admin), 'formation-1', 'admin-create'), validPole()));
});

test('admin can update a pole and toggle active', async () => {
  await seedPole();
  const ref = poleRef(dbFor(users.admin));
  await assertSucceeds(updateDoc(ref, { name: 'Polo Norte', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { active: false, updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { active: true, updatedAt: serverTimestamp() }));
});

test('assigned coordinator can read and update a pole name', async () => {
  await seedPole();
  const db = dbFor(users.coordinator);
  await assertSucceeds(getDocs(collection(db, 'formations', 'formation-1', 'poles')));
  await assertSucceeds(updateDoc(poleRef(db), { name: 'Polo Coordenado', updatedAt: serverTimestamp() }));
});

test('assigned coordinator can update baseChapelId and chapelIds together', async () => {
  await seedPole();
  await assertSucceeds(updateDoc(poleRef(dbFor(users.coordinator)), {
    baseChapelId: 'chapel-b',
    chapelIds: ['chapel-a', 'chapel-b'],
    updatedAt: serverTimestamp(),
  }));
});

for (const [field, value] of [
  ['coordinatorIds', [users.admin.uid]],
  ['active', false],
  ['createdAt', serverTimestamp()],
  ['updatedAt', Timestamp.fromDate(new Date('2000-01-01T00:00:00.000Z'))],
]) {
  test(`assigned coordinator cannot modify ${field}`, async () => {
    await seedPole();
    const update = { [field]: value };
    if (field !== 'updatedAt') update.updatedAt = serverTimestamp();
    await assertFails(updateDoc(poleRef(dbFor(users.coordinator)), update));
  });
}

test('active unassigned coordinator can read but cannot update a pole', async () => {
  await seedPole();
  const db = dbFor(users.unassignedCoordinator);
  await assertSucceeds(getDocs(collection(db, 'formations', 'formation-1', 'poles')));
  await assertFails(updateDoc(poleRef(db), { name: 'Denied', updatedAt: serverTimestamp() }));
});

test('coordinator cannot create a pole', async () => {
  await seedFormation();
  await assertFails(setDoc(poleRef(dbFor(users.coordinator), 'formation-1', 'coordinator-create'), validPole()));
});

test('viewer can read poles but cannot write them', async () => {
  await seedPole();
  const db = dbFor(users.viewer);
  await assertSucceeds(getDocs(collection(db, 'formations', 'formation-1', 'poles')));
  await assertFails(updateDoc(poleRef(db), { name: 'Denied', updatedAt: serverTimestamp() }));
});

test('inactive user cannot read or write poles', async () => {
  await seedPole();
  const db = dbFor(users.inactive);
  await assertFails(getDocs(collection(db, 'formations', 'formation-1', 'poles')));
  await assertFails(updateDoc(poleRef(db), { name: 'Denied', updatedAt: serverTimestamp() }));
});

test('unauthenticated user cannot read or write poles', async () => {
  await seedPole();
  const db = dbFor();
  await assertFails(getDocs(collection(db, 'formations', 'formation-1', 'poles')));
  await assertFails(updateDoc(poleRef(db), { name: 'Denied', updatedAt: serverTimestamp() }));
});

test('pole creation requires an existing parent formation', async () => {
  await assertFails(setDoc(poleRef(dbFor(users.admin), 'missing-formation'), validPole()));
});

const invalidPoles = [
  ['baseChapelId is outside chapelIds', (data) => { data.baseChapelId = 'chapel-c'; }],
  ['chapelIds is empty', (data) => { data.chapelIds = []; }],
  ['coordinatorIds is not a list', (data) => { data.coordinatorIds = users.coordinator.uid; }],
  ['chapelIds is not a list', (data) => { data.chapelIds = 'chapel-a'; }],
  ['active is not boolean', (data) => { data.active = 'true'; }],
  ['name is not a string', (data) => { data.name = 1; }],
  ['unexpected field exists', (data) => { data.unexpected = true; }],
  ['createdAt is not a timestamp', (data) => { data.createdAt = 'now'; }],
  ['updatedAt is not a timestamp', (data) => { data.updatedAt = 'now'; }],
];

for (const [description, invalidate] of invalidPoles) {
  test(`pole schema rejects creation when ${description}`, async () => {
    await seedFormation();
    const data = validPole();
    invalidate(data);
    await assertFails(setDoc(poleRef(dbFor(users.admin), 'formation-1', `invalid-${description.replace(/[^a-z]/gi, '-')}`), data));
  });
}

test('admin cannot alter a pole createdAt and must use request.time for updatedAt', async () => {
  await seedPole();
  const db = dbFor(users.admin);
  await assertFails(updateDoc(poleRef(db), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(poleRef(db), {
    name: 'Wrong audit timestamp',
    updatedAt: Timestamp.fromDate(new Date('2000-01-01T00:00:00.000Z')),
  }));
});

test('admin and pole coordinator can create encounters', async () => {
  await seedPole();
  await assertSucceeds(setDoc(encounterRef(dbFor(users.admin), 'formation-1', 'pole-1', 'admin-encounter'), validEncounter()));
  await assertSucceeds(setDoc(encounterRef(dbFor(users.coordinator), 'formation-1', 'pole-1', 'coordinator-encounter'), validEncounter({ createdBy: users.coordinator.uid })));
});

test('pole coordinator can create only a self-assigned designated encounter', async () => {
  await seedPole();
  const db = dbFor(users.coordinator);
  await assertSucceeds(setDoc(encounterRef(db, 'formation-1', 'pole-1', 'self-assigned'), validEncounter({ createdBy: users.coordinator.uid })));
  await assertFails(setDoc(encounterRef(db, 'formation-1', 'pole-1', 'external'), validEncounter({ createdBy: users.coordinator.uid, coordinatorIds: [users.substitute.uid], responsibilities: [{ userId: users.substitute.uid, type: 'designated', status: 'confirmed' }] })));
  await assertFails(setDoc(encounterRef(db, 'formation-1', 'pole-1', 'multiple'), validEncounter({ createdBy: users.coordinator.uid, coordinatorIds: [users.coordinator.uid, users.substitute.uid], responsibilities: [{ userId: users.coordinator.uid, type: 'designated', status: 'confirmed' }, { userId: users.substitute.uid, type: 'designated', status: 'confirmed' }] })));
  await assertFails(setDoc(encounterRef(db, 'formation-1', 'pole-1', 'substitute'), validEncounter({ createdBy: users.coordinator.uid, responsibilities: [{ userId: users.coordinator.uid, type: 'substitute', replacesUserId: users.substitute.uid, status: 'confirmed' }] })));
});

test('admin can still create encounters with multiple responsibilities and coordinatorIds', async () => {
  await seedPole();
  await assertSucceeds(setDoc(encounterRef(dbFor(users.admin), 'formation-1', 'pole-1', 'admin-multiple'), validEncounter({ coordinatorIds: [users.coordinator.uid, users.substitute.uid], responsibilities: [{ userId: users.coordinator.uid, type: 'designated', status: 'confirmed' }, { userId: users.substitute.uid, type: 'substitute', replacesUserId: users.coordinator.uid, status: 'confirmed' }] })));
});

test('active users can read encounters while inactive and anonymous users cannot', async () => {
  await seedEncounter();
  await assertSucceeds(getDocs(collection(dbFor(users.viewer), 'formations', 'formation-1', 'poles', 'pole-1', 'encounters')));
  await assertFails(getDocs(collection(dbFor(users.inactive), 'formations', 'formation-1', 'poles', 'pole-1', 'encounters')));
  await assertFails(getDocs(collection(dbFor(), 'formations', 'formation-1', 'poles', 'pole-1', 'encounters')));
});

test('effective coordinator can start and complete but cannot edit agenda or cancel', async () => {
  await seedEncounter({ coordinatorIds: [users.substitute.uid], responsibilities: [{ userId: users.substitute.uid, type: 'substitute', replacesUserId: users.coordinator.uid, status: 'confirmed' }] });
  const db = dbFor(users.substitute);
  await assertSucceeds(updateDoc(encounterRef(db), { status: 'in_progress', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(encounterRef(db), { status: 'completed', updatedAt: serverTimestamp() }));
  await seedEncounter();
  await assertFails(updateDoc(encounterRef(db), { title: 'Denied', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(encounterRef(db), { status: 'cancelled', updatedAt: serverTimestamp() }));
});

test('admin can cancel scheduled and reopen completed encounters', async () => {
  await seedEncounter();
  await assertSucceeds(updateDoc(encounterRef(dbFor(users.admin)), { status: 'cancelled', updatedAt: serverTimestamp() }));
  await seedEncounter({ status: 'completed' });
  await assertSucceeds(updateDoc(encounterRef(dbFor(users.admin)), { status: 'in_progress', updatedAt: serverTimestamp() }));
});

test('pole coordinator can edit scheduled agenda and manage status but cannot alter responsibilities', async () => {
  await seedEncounter();
  const db = dbFor(users.coordinator);
  await assertSucceeds(updateDoc(encounterRef(db), { title: 'Agenda atualizada', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(encounterRef(db), { responsibilities: [{ userId: users.substitute.uid, type: 'substitute', replacesUserId: users.coordinator.uid, status: 'confirmed' }], coordinatorIds: [users.substitute.uid], updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(encounterRef(db), { responsibilities: [{ userId: 'arbitrary-uid', type: 'designated', status: 'confirmed' }], coordinatorIds: ['arbitrary-uid'], updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(encounterRef(db), { coordinatorIds: [users.substitute.uid], updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(encounterRef(db), { responsibilities: [{ userId: users.coordinator.uid, type: 'designated', status: 'cancelled' }], updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(encounterRef(db), { status: 'cancelled', updatedAt: serverTimestamp() }));
});

test('effective substitute cannot alter responsibilities or coordinatorIds', async () => {
  await seedEncounter({ coordinatorIds: [users.substitute.uid], responsibilities: [{ userId: users.substitute.uid, type: 'substitute', replacesUserId: users.coordinator.uid, status: 'confirmed' }] });
  const db = dbFor(users.substitute);
  await assertFails(updateDoc(encounterRef(db), { responsibilities: [{ userId: users.substitute.uid, type: 'substitute', replacesUserId: users.coordinator.uid, status: 'cancelled' }], updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(encounterRef(db), { coordinatorIds: [users.coordinator.uid], updatedAt: serverTimestamp() }));
});

test('active unassigned coordinator has read-only access and no contextual encounter permissions', async () => {
  await seedEncounter();
  const db = dbFor(users.unassignedCoordinator);
  await assertSucceeds(getDocs(collection(db, 'formations', 'formation-1', 'poles', 'pole-1', 'encounters')));
  await assertFails(setDoc(encounterRef(db, 'formation-1', 'pole-1', 'unassigned-create'), validEncounter({ createdBy: users.unassignedCoordinator.uid, coordinatorIds: [users.unassignedCoordinator.uid], responsibilities: [{ userId: users.unassignedCoordinator.uid, type: 'designated', status: 'confirmed' }] })));
  await assertFails(updateDoc(encounterRef(db), { title: 'Denied', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(encounterRef(db), { status: 'in_progress', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(encounterRef(db), { responsibilities: [{ userId: users.unassignedCoordinator.uid, type: 'designated', status: 'confirmed' }], coordinatorIds: [users.unassignedCoordinator.uid], updatedAt: serverTimestamp() }));
});

test('non-admin operational actors cannot combine status or attendance with coordinatorIds', async () => {
  await seedEncounter();
  await assertFails(updateDoc(encounterRef(dbFor(users.coordinator)), { status: 'in_progress', coordinatorIds: [users.coordinator.uid, users.substitute.uid], updatedAt: serverTimestamp() }));
  await seedEncounter({ status: 'in_progress', coordinatorIds: [users.substitute.uid], responsibilities: [{ userId: users.substitute.uid, type: 'designated', status: 'confirmed' }] });
  await assertFails(updateDoc(encounterRef(dbFor(users.substitute)), { coordinatorIds: [users.substitute.uid, users.coordinator.uid], updatedAt: serverTimestamp() }));
  await seedParticipant({}, { status: 'in_progress' });
  const db = dbFor(users.coordinator); const batch = writeBatch(db);
  batch.update(participantRef(db), attendanceUpdate(users.coordinator, 'present'));
  batch.update(encounterRef(db), { coordinatorIds: [users.coordinator.uid, users.substitute.uid], updatedAt: serverTimestamp() });
  await assertFails(batch.commit());
});

test('admin can manage encounter responsibilities and derived coordinatorIds', async () => {
  await seedEncounter();
  await assertSucceeds(updateDoc(encounterRef(dbFor(users.admin)), {
    responsibilities: [{ userId: users.substitute.uid, type: 'substitute', replacesUserId: users.coordinator.uid, status: 'confirmed' }],
    coordinatorIds: [users.substitute.uid],
    updatedAt: serverTimestamp(),
  }));
});

test('encounter schema rejects invalid location, timing, parents and audit fields', async () => {
  await seedFormation();
  await assertFails(setDoc(encounterRef(dbFor(users.admin)), validEncounter()));
  await seedPole();
  await assertFails(setDoc(encounterRef(dbFor(users.admin), 'formation-1', 'pole-1', 'invalid-location'), validEncounter({ location: { chapelId: 'chapel-x', name: 'X' } })));
  await assertFails(setDoc(encounterRef(dbFor(users.admin), 'formation-1', 'pole-1', 'invalid-time'), validEncounter({ endAt: Timestamp.fromDate(new Date('2026-03-09T10:00:00.000Z') ) })));
  await assertFails(setDoc(encounterRef(dbFor(users.admin), 'formation-1', 'pole-1', 'invalid-field'), validEncounter({ unexpected: true })));
});

test('admin and pole coordinator manage scheduled participants and exclusions', async () => {
  await seedEncounter();
  for (const user of [users.admin, users.coordinator]) {
    const db = dbFor(user); const id = user.uid;
    await assertSucceeds(setDoc(participantRef(db, `server-${id}`), validParticipant({ serverId: `server-${id}`, participationType: 'manual', addedManually: true, addedBy: user.uid })));
    await assertSucceeds(getDoc(participantRef(db, `server-${id}`)));
    await assertSucceeds(deleteDoc(participantRef(db, `server-${id}`)));
    await assertSucceeds(setDoc(exclusionRef(db, `server-${id}`), validExclusion({ serverId: `server-${id}`, excludedBy: user.uid })));
    await assertSucceeds(deleteDoc(exclusionRef(db, `server-${id}`)));
  }
});

test('scheduled participant lifecycle is additive, preserves exclusions, and permits manual reinclusion', async () => {
  await seedEncounter();
  const db = dbFor(users.admin);
  await assertSucceeds(setDoc(participantRef(db, 'eligible-a'), validParticipant({ serverId: 'eligible-a' })));
  await assertSucceeds(setDoc(participantRef(db, 'eligible-b'), validParticipant({ serverId: 'eligible-b' })));
  await assertSucceeds(deleteDoc(participantRef(db, 'eligible-b')));
  await assertSucceeds(setDoc(exclusionRef(db, 'eligible-b'), validExclusion({ serverId: 'eligible-b' })));

  // Regeneration adds only the new eligible candidate; existing and excluded IDs stay untouched.
  await assertSucceeds(setDoc(participantRef(db, 'eligible-c'), validParticipant({ serverId: 'eligible-c' })));
  await assertFails(setDoc(participantRef(db, 'eligible-a'), validParticipant({ serverId: 'eligible-a' })));
  assert.equal((await getDoc(exclusionRef(db, 'eligible-b'))).exists(), true);

  const reinclusion = writeBatch(db);
  reinclusion.delete(exclusionRef(db, 'eligible-b'));
  reinclusion.set(participantRef(db, 'eligible-b'), validParticipant({ serverId: 'eligible-b', participationType: 'manual', addedManually: true }));
  await assertSucceeds(reinclusion.commit());
  const participants = await getDocs(collection(db, 'formations', 'formation-1', 'poles', 'pole-1', 'encounters', 'encounter-1', 'participants'));
  assert.deepEqual(participants.docs.map((item) => item.id).sort(), ['eligible-a', 'eligible-b', 'eligible-c']);
  assert.equal((await getDoc(exclusionRef(db, 'eligible-b'))).exists(), false);
});

test('participant and exclusion reads are active-only while contextual writes are denied', async () => {
  await seedEncounter();
  for (const user of [users.substitute, users.viewer]) { const db = dbFor(user); await assertSucceeds(getDocs(collection(db, 'formations', 'formation-1', 'poles', 'pole-1', 'encounters', 'encounter-1', 'participants'))); await assertFails(setDoc(participantRef(db, `x-${user.uid}`), validParticipant({ serverId: `x-${user.uid}`, addedBy: user.uid }))); }
  for (const user of [users.inactive, undefined]) { const db = dbFor(user); await assertFails(getDocs(collection(db, 'formations', 'formation-1', 'poles', 'pole-1', 'encounters', 'encounter-1', 'participants'))); }
});

test('active unassigned coordinator cannot manage participants, exclusions, or attendance', async () => {
  await seedParticipant({}, { status: 'in_progress' });
  const db = dbFor(users.unassignedCoordinator);
  await assertSucceeds(getDocs(collection(db, 'formations', 'formation-1', 'poles', 'pole-1', 'encounters', 'encounter-1', 'participants')));
  await assertFails(setDoc(participantRef(db, 'unassigned'), validParticipant({ serverId: 'unassigned', addedBy: users.unassignedCoordinator.uid })));
  await assertFails(setDoc(exclusionRef(db, 'unassigned'), validExclusion({ serverId: 'unassigned', excludedBy: users.unassignedCoordinator.uid })));
  await assertFails(updateDoc(participantRef(db), attendanceUpdate(users.unassignedCoordinator, 'present')));
});

test('participant schemas, updates and non-scheduled writes are rejected', async () => {
  await seedEncounter(); const db = dbFor(users.admin);
  await assertFails(setDoc(participantRef(db, 'different'), validParticipant()));
  await assertFails(setDoc(participantRef(db, 'bad'), validParticipant({ serverId: 'bad', attendanceStatus: 'present' })));
  await assertFails(setDoc(participantRef(db, 'bad2'), validParticipant({ serverId: 'bad2', addedBy: users.coordinator.uid })));
  await assertFails(setDoc(participantRef(db, 'bad3'), validParticipant({ serverId: 'bad3', unexpected: true })));
  await assertSucceeds(setDoc(participantRef(db, 'ok'), validParticipant({ serverId: 'ok' })));
  await assertFails(updateDoc(participantRef(db, 'ok'), { serverName: 'Changed', updatedAt: serverTimestamp() }));
  await seedEncounter({ status: 'in_progress' }); await assertFails(setDoc(participantRef(db, 'late'), validParticipant({ serverId: 'late' })));
});

test('in-progress encounter rejects participant generate, manual add, remove, and exclusion writes', async () => {
  await seedEncounter({ status: 'in_progress' });
  const db = dbFor(users.admin);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const bypass = context.firestore();
    await setDoc(participantRef(bypass, 'existing'), { ...validParticipant({ serverId: 'existing' }), createdAt: Timestamp.fromDate(new Date()), updatedAt: Timestamp.fromDate(new Date()) });
    await setDoc(exclusionRef(bypass, 'excluded'), { ...validExclusion({ serverId: 'excluded' }), createdAt: Timestamp.fromDate(new Date()) });
  });
  await assertFails(setDoc(participantRef(db, 'generated'), validParticipant({ serverId: 'generated' })));
  await assertFails(setDoc(participantRef(db, 'manual'), validParticipant({ serverId: 'manual', participationType: 'manual', addedManually: true })));
  await assertFails(deleteDoc(participantRef(db, 'existing')));
  await assertFails(setDoc(exclusionRef(db, 'new-exclusion'), validExclusion({ serverId: 'new-exclusion' })));
  await assertFails(deleteDoc(exclusionRef(db, 'excluded')));
});

function attendanceUpdate(user, attendanceStatus, attendanceNote) {
  return {
    attendanceStatus,
    ...(attendanceNote === undefined ? {} : { attendanceNote }),
    recordedBy: user.uid,
    recordedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

test('admin records, corrects, and resets attendance in progress and corrects completed', async () => {
  await seedParticipant({}, { status: 'in_progress' });
  const ref = participantRef(dbFor(users.admin));
  await assertSucceeds(updateDoc(ref, attendanceUpdate(users.admin, 'present')));
  const recorded = await getDoc(ref);
  assert.equal(recorded.data().recordedBy, users.admin.uid);
  assert.ok(recorded.data().recordedAt);
  await assertSucceeds(updateDoc(ref, attendanceUpdate(users.admin, 'absent', 'Chegou após o encontro')));
  await assertSucceeds(updateDoc(ref, attendanceUpdate(users.admin, 'justified', 'Atestado médico')));
  await assertSucceeds(updateDoc(ref, { attendanceStatus: 'pending', attendanceNote: deleteField(), recordedBy: deleteField(), recordedAt: deleteField(), updatedAt: serverTimestamp() }));
  await seedParticipant({}, { status: 'completed' });
  await assertSucceeds(updateDoc(participantRef(dbFor(users.admin)), attendanceUpdate(users.admin, 'present')));
});

test('pole coordinator and effective coordinator update in progress, but not completed', async () => {
  await seedParticipant({}, { status: 'in_progress', coordinatorIds: [users.substitute.uid], responsibilities: [{ userId: users.substitute.uid, type: 'designated', status: 'confirmed' }] });
  await assertSucceeds(updateDoc(participantRef(dbFor(users.coordinator)), attendanceUpdate(users.coordinator, 'present')));
  await assertSucceeds(updateDoc(participantRef(dbFor(users.substitute)), attendanceUpdate(users.substitute, 'absent')));
  await seedParticipant({}, { status: 'completed' });
  await assertFails(updateDoc(participantRef(dbFor(users.coordinator)), attendanceUpdate(users.coordinator, 'present')));
});

test('confirmed substitute is restricted to its encounter', async () => {
  const substituteEncounter = { status: 'in_progress', coordinatorIds: [users.substitute.uid], responsibilities: [{ userId: users.substitute.uid, type: 'substitute', replacesUserId: users.coordinator.uid, status: 'confirmed' }] };
  await seedParticipant({}, substituteEncounter);
  await assertSucceeds(updateDoc(participantRef(dbFor(users.substitute)), attendanceUpdate(users.substitute, 'present')));
  await seedParticipant({ serverId: 'server-2' }, { ...substituteEncounter, id: 'encounter-2', coordinatorIds: [users.coordinator.uid], responsibilities: [{ userId: users.coordinator.uid, type: 'designated', status: 'confirmed' }] });
  await assertFails(updateDoc(participantRef(dbFor(users.substitute), 'server-2', 'encounter-2'), attendanceUpdate(users.substitute, 'present')));
});

test('attendance is rejected for unrelated, viewer, inactive, anonymous, scheduled, and cancelled contexts', async () => {
  await seedParticipant({}, { status: 'in_progress', coordinatorIds: [], responsibilities: [] });
  for (const user of [users.substitute, users.viewer, users.inactive, undefined]) {
    await assertFails(updateDoc(participantRef(dbFor(user)), attendanceUpdate(user || users.admin, 'present')));
  }
  await seedParticipant({}, { status: 'scheduled' });
  await assertFails(updateDoc(participantRef(dbFor(users.admin)), attendanceUpdate(users.admin, 'present')));
  await seedParticipant({}, { status: 'cancelled' });
  await assertFails(updateDoc(participantRef(dbFor(users.admin)), attendanceUpdate(users.admin, 'present')));
});

test('attendance schema protects audit fields, notes, and immutable participant snapshots', async () => {
  await seedParticipant({}, { status: 'in_progress' });
  const db = dbFor(users.admin); const ref = participantRef(db);
  await assertFails(updateDoc(ref, attendanceUpdate(users.admin, 'invalid')));
  await assertFails(updateDoc(ref, attendanceUpdate(users.admin, 'justified')));
  await assertFails(updateDoc(ref, attendanceUpdate(users.admin, 'justified', '   ')));
  await assertFails(updateDoc(ref, attendanceUpdate(users.admin, 'present', 'x'.repeat(501))));
  await assertFails(updateDoc(ref, { ...attendanceUpdate(users.admin, 'present'), recordedBy: users.coordinator.uid }));
  await assertFails(updateDoc(ref, { ...attendanceUpdate(users.admin, 'present'), recordedAt: Timestamp.fromDate(new Date('2000-01-01T00:00:00.000Z')) }));
  await assertFails(updateDoc(ref, { ...attendanceUpdate(users.admin, 'present'), updatedAt: Timestamp.fromDate(new Date('2000-01-01T00:00:00.000Z')) }));
  await assertFails(updateDoc(ref, { ...attendanceUpdate(users.admin, 'present'), serverName: 'Alterado' }));
  await assertFails(updateDoc(ref, { ...attendanceUpdate(users.admin, 'present'), chapelId: 'chapel-b' }));
  await assertFails(updateDoc(ref, { ...attendanceUpdate(users.admin, 'present'), participationType: 'manual' }));
  await assertFails(updateDoc(ref, { ...attendanceUpdate(users.admin, 'present'), addedBy: users.coordinator.uid }));
  await assertFails(updateDoc(ref, { ...attendanceUpdate(users.admin, 'present'), createdAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { ...attendanceUpdate(users.admin, 'present'), unexpected: true }));
  await assertFails(updateDoc(ref, { attendanceStatus: 'pending', attendanceNote: 'No borrar', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { attendanceStatus: 'pending', recordedBy: users.admin.uid, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { attendanceStatus: 'pending', recordedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { attendanceStatus: 'pending', attendanceNote: 'No borrar', recordedBy: users.admin.uid, recordedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});
