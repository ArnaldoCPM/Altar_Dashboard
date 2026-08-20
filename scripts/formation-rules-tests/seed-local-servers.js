/*
 * SOLO DESARROLLO LOCAL. Este script usa exclusivamente Firestore Emulator
 * en 127.0.0.1:8080 y nunca utiliza credenciales ni endpoints cloud.
 */
const net = require('node:net');
const { doc, getDoc, setDoc } = require('firebase/firestore');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'dashboard-servidores';
const EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;
const SERVER_PATH = ['artifacts', 'default-app-id', 'public', 'data', 'servers'];

// T4.5 accepts d/m/yyyy. January 1 makes the requested age stable throughout 2026.
const SERVERS = [
  { id: 'server-test-1', Nome: 'Servidor Teste 1', Data_nascimento: '01/01/2017', Tipo: 'Candidato', Capela: 'Capela Teste São José', chapelId: 'chapel-test-1' },
  { id: 'server-test-2', Nome: 'Servidor Teste 2', Data_nascimento: '01/01/2016', Tipo: 'Formando', Capela: 'Capela Teste Santa Rita', chapelId: 'chapel-test-2' },
  { id: 'server-test-3', Nome: 'Servidor Teste 3', Data_nascimento: '01/01/2017', Tipo: 'Instituído', Capela: 'Capela Teste São José', chapelId: 'chapel-test-1' },
  { id: 'server-test-4', Nome: 'Servidor Teste 4', Data_nascimento: '01/01/2012', Tipo: 'Candidato', Capela: 'Capela Teste Santa Rita', chapelId: 'chapel-test-2' },
  { id: 'server-test-5', Nome: 'Servidor Teste 5', Data_nascimento: '01/01/2017', Tipo: 'Candidato', Capela: 'Capela Teste Fora do Polo', chapelId: 'chapel-test-3' },
  { id: 'server-test-6', Nome: 'Servidor Teste 6', Data_nascimento: 'data-invalida', Tipo: 'Candidato', Capela: 'Capela Teste São José', chapelId: 'chapel-test-1' },
];

function assertFirestoreEmulator() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: EMULATOR_HOST, port: FIRESTORE_PORT });
    socket.setTimeout(2000);
    const unavailable = () => reject(new Error(`Firestore Emulator is unavailable at ${EMULATOR_HOST}:${FIRESTORE_PORT}. Start it before running this local-only seed.`));
    socket.once('connect', () => { socket.destroy(); resolve(); });
    socket.once('timeout', () => { socket.destroy(); unavailable(); });
    socket.once('error', unavailable);
  });
}

function serverRef(firestore, id) {
  return doc(firestore, ...SERVER_PATH, id);
}

async function verifySeed(firestore) {
  for (const server of SERVERS) {
    const snapshot = await getDoc(serverRef(firestore, server.id));
    const data = snapshot.data();
    if (!snapshot.exists() || snapshot.id !== server.id) throw new Error(`Server validation failed: ${server.id} (document ID)`);
    for (const [key, value] of Object.entries(server)) {
      if (key !== 'id' && data[key] !== value) throw new Error(`Server validation failed: ${server.id} (${key})`);
    }
  }
}

async function main() {
  await assertFirestoreEmulator();
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: EMULATOR_HOST, port: FIRESTORE_PORT },
  });

  try {
    let results = [];
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      const statuses = [];
      for (const server of SERVERS) {
        const reference = serverRef(firestore, server.id);
        statuses.push({ id: server.id, reused: (await getDoc(reference)).exists() });
        await setDoc(reference, {
          Nome: server.Nome,
          Data_nascimento: server.Data_nascimento,
          Tipo: server.Tipo,
          Capela: server.Capela,
          chapelId: server.chapelId,
        });
      }
      await verifySeed(firestore);
      results = statuses;
    });

    for (const result of results) console.log(`${result.reused ? 'Reused' : 'Created'}: ${result.id}`);
    console.log(`Validated ${SERVERS.length} fictional servers at ${SERVER_PATH.join('/')}/{serverId} on ${EMULATOR_HOST}:${FIRESTORE_PORT}.`);
  } finally {
    await testEnv.cleanup();
  }
}

main().catch((error) => {
  console.error(`Local Emulator server seed failed: ${error.message}`);
  process.exitCode = 1;
});
