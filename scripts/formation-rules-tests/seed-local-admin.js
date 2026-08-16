/*
 * SOLO DESARROLLO LOCAL. Este script nunca usa endpoints ni credenciales cloud.
 * Requiere Firebase Auth Emulator (127.0.0.1:9099) y Firestore Emulator
 * (127.0.0.1:8080) ya iniciados.
 */
const net = require('node:net');
const { initializeApp } = require('firebase/app');
const {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} = require('firebase/auth');
const { doc, setDoc } = require('firebase/firestore');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'dashboard-servidores';
const EMULATOR_HOST = '127.0.0.1';
const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8080;
const email = process.env.LOCAL_ADMIN_EMAIL || 'admin.local@example.test';
const password = process.env.LOCAL_ADMIN_PASSWORD || 'local-admin-password';

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

async function getOrCreateLocalAdmin(auth) {
  try {
    return (await createUserWithEmailAndPassword(auth, email, password)).user;
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') throw error;
    return (await signInWithEmailAndPassword(auth, email, password)).user;
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
    appId: 'local-emulator-admin-seed',
  }, 'local-emulator-admin-seed');
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, { disableWarnings: true });
  const user = await getOrCreateLocalAdmin(auth);

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: EMULATOR_HOST, port: FIRESTORE_PORT },
  });

  try {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'admin',
        active: true,
        chapelId: 'chapel-test',
      });
    });
  } finally {
    await testEnv.cleanup();
  }

  console.log(`Local Emulator admin ready: ${user.email} (${user.uid})`);
  console.log('This account exists only in the local Firebase Emulators.');
}

main().catch((error) => {
  console.error(`Local Emulator seed failed: ${error.message}`);
  process.exitCode = 1;
});
