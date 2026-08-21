/*
 * SOLO DESARROLLO LOCAL. Este script usa exclusivamente Firebase Emulator.
 * Requiere Auth Emulator (127.0.0.1:9099) y Firestore Emulator
 * (127.0.0.1:8080) iniciados antes de ejecutarse.
 */
const net = require('node:net');
const { initializeApp } = require('firebase/app');
const {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} = require('firebase/auth');
const { doc, getDoc, setDoc } = require('firebase/firestore');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'dashboard-servidores';
const EMULATOR_HOST = '127.0.0.1';
const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8080;
const LOCAL_PASSWORD = 'Test123456!';
const LOCAL_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD || 'local-admin-password';

const CHAPELS = [
  { id: 'chapel-test-1', name: 'Capela Teste São José', active: true },
  { id: 'chapel-test-2', name: 'Capela Teste Santa Rita', active: true },
  { id: 'chapel-test-3', name: 'Capela Teste Nossa Senhora', active: true },
];

const LOCAL_USERS = [
  { email: 'admin.local@example.test', password: LOCAL_ADMIN_PASSWORD, displayName: 'Administrador Local', role: 'admin', active: true, chapelId: '' },
  { email: 'coordinator.local@example.test', displayName: 'Coordenador Local', role: 'coordinator', active: true, chapelId: 'chapel-test-1' },
  { email: 'viewer.local@example.test', displayName: 'Visualizador Local', role: 'viewer', active: true, chapelId: 'chapel-test-2' },
  { email: 'coordinator.inactive@example.test', displayName: 'Coordenador Inativo', role: 'coordinator', active: false, chapelId: 'chapel-test-3' },
];

function assertLocalEndpoint(name, port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: EMULATOR_HOST, port });
    socket.setTimeout(2000);
    socket.once('connect', () => {
      socket.destroy();
      resolve();
    });
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error(`${name} Emulator is unavailable at ${EMULATOR_HOST}:${port}. Start it with firebase emulators:start --only auth,firestore.`));
    });
    socket.once('error', () => {
      reject(new Error(`${name} Emulator is unavailable at ${EMULATOR_HOST}:${port}. Start it with firebase emulators:start --only auth,firestore.`));
    });
  });
}

async function getOrCreateLocalUser(auth, email, password = LOCAL_PASSWORD) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: credential.user, created: true };
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') throw error;
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { user: credential.user, created: false };
  }
}

async function verifySeed(firestore, seededUsers) {
  for (const chapel of CHAPELS) {
    const snapshot = await getDoc(doc(firestore, 'chapels', chapel.id));
    if (!snapshot.exists() || snapshot.data().name !== chapel.name || snapshot.data().active !== true) {
      throw new Error(`Chapel validation failed: ${chapel.id}`);
    }
  }

  for (const seededUser of seededUsers) {
    const snapshot = await getDoc(doc(firestore, 'users', seededUser.uid));
    const profile = snapshot.data();
    if (!snapshot.exists() || profile.uid !== seededUser.uid || profile.email !== seededUser.email || profile.role !== seededUser.role || profile.active !== seededUser.active || profile.chapelId !== seededUser.chapelId) {
      throw new Error(`User validation failed: ${seededUser.email}`);
    }
  }
}

async function main() {
  await Promise.all([
    assertLocalEndpoint('Auth', AUTH_PORT),
    assertLocalEndpoint('Firestore', FIRESTORE_PORT),
  ]);

  const app = initializeApp({
    apiKey: 'local-emulator-only',
    projectId: PROJECT_ID,
    appId: 'local-emulator-poles-seed',
  }, 'local-emulator-poles-seed');
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, { disableWarnings: true });

  const authenticatedUsers = [];
  for (const profile of LOCAL_USERS) {
    const result = await getOrCreateLocalUser(auth, profile.email, profile.password);
    authenticatedUsers.push({ ...profile, uid: result.user.uid, created: result.created });
  }

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: EMULATOR_HOST, port: FIRESTORE_PORT },
  });

  try {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      for (const chapel of CHAPELS) {
        await setDoc(doc(firestore, 'chapels', chapel.id), chapel, { merge: true });
      }
      for (const profile of authenticatedUsers) {
        await setDoc(doc(firestore, 'users', profile.uid), {
          uid: profile.uid,
          email: profile.email,
          displayName: profile.displayName,
          role: profile.role,
          active: profile.active,
          chapelId: profile.chapelId,
        }, { merge: true });
      }
      await verifySeed(firestore, authenticatedUsers);
    });
  } finally {
    await testEnv.cleanup();
  }

  console.log('Local Emulator Poles seed ready. Admin uses LOCAL_ADMIN_PASSWORD or its local default; other accounts use Test123456!.');
  for (const profile of authenticatedUsers) {
    console.log(`${profile.created ? 'Created' : 'Reused'}: ${profile.email} (${profile.uid})`);
  }
  for (const chapel of CHAPELS) {
    console.log(`Ready chapel: ${chapel.id} (${chapel.name})`);
  }
  console.log('Validated 3 active chapels and canonical user profiles (users/{uid}).');
}

main().catch((error) => {
  console.error(`Local Emulator Poles seed failed: ${error.message}`);
  process.exitCode = 1;
});
