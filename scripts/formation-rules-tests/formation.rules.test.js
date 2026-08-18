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
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} = require('firebase/firestore');

const PROJECT_ID = 'sgsa-formation-rules-tests';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [host, portValue] = EMULATOR_HOST.split(':');
const port = Number(portValue || 8080);

const users = {
  admin: { uid: 'admin-uid', email: 'admin@example.test', role: 'admin', active: true, chapelId: 'chapel-a' },
  coordinator: { uid: 'coordinator-uid', email: 'coordinator@example.test', role: 'coordinator', active: true, chapelId: 'chapel-a' },
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

test('unassigned coordinator can read but cannot update a pole', async () => {
  await seedPole({ coordinatorIds: [] });
  const db = dbFor(users.coordinator);
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
