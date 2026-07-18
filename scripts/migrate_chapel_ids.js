async function loadFirebaseSdk() {
  const [{ initializeApp }, { getAuth, signInAnonymously }, { getFirestore, collection, getDocs }] =
    await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
    ]);

  return {
    initializeApp,
    getAuth,
    signInAnonymously,
    getFirestore,
    collection,
    getDocs
  };
}

function getFirebaseConfig() {
  if (typeof globalThis.__firebase_config !== "undefined" && globalThis.__firebase_config) {
    return JSON.parse(globalThis.__firebase_config);
  }

  return {
    apiKey: "AIzaSyBhWhXdwjqDaG5oPLN-l-Ts7EVHF6-wkuI",
    authDomain: "dashboard-servidores.firebaseapp.com",
    projectId: "dashboard-servidores",
    storageBucket: "dashboard-servidores.firebasestorage.app",
    messagingSenderId: "991942921277",
    appId: "1:991942921277:web:a44ac020b4881195bdae54"
  };
}

function getAuditAppId() {
  return (
    globalThis.ALTAR_APP_ID ||
    globalThis.__app_id ||
    "default-app-id"
  );
}

function normalizeChapelName(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase();
}

function buildChapelMap(chapels) {
  const nameToChapelId = new Map();
  const duplicateNames = [];

  chapels.forEach((chapel) => {
    const normalizedName = normalizeChapelName(chapel.name);

    if (!normalizedName) {
      duplicateNames.push({
        id: chapel.id,
        name: chapel.name || "",
        reason: "Capilla sin nombre utilizable"
      });
      return;
    }

    if (nameToChapelId.has(normalizedName)) {
      duplicateNames.push({
        id: chapel.id,
        name: chapel.name,
        reason: `Nombre duplicado. Ya existe ${nameToChapelId.get(normalizedName)}`
      });
      return;
    }

    nameToChapelId.set(normalizedName, chapel.id);
  });

  return {
    nameToChapelId,
    duplicateNames
  };
}

function createServerIssue(serverId, capelaValue, reason) {
  return {
    id: serverId,
    Capela: capelaValue || "",
    motivo: reason
  };
}

function auditServers(servers, chapelMap) {
  const issues = [];
  let matchesFound = 0;
  let serversWithChapelId = 0;
  let serversNeedingUpdate = 0;

  servers.forEach((server) => {
    const capelaValue = (server.Capela || "").toString().trim();
    const normalizedCapela = normalizeChapelName(capelaValue);
    const matchedChapelId = chapelMap.get(normalizedCapela) || null;
    const existingChapelId = server.chapelId || server.capela_id || server.capelaId || null;

    if (existingChapelId) {
      serversWithChapelId += 1;
    }

    if (!capelaValue) {
      issues.push(
        createServerIssue(
          server.id,
          capelaValue,
          "Campo Capela vacío o ausente"
        )
      );
      return;
    }

    if (!matchedChapelId) {
      issues.push(
        createServerIssue(
          server.id,
          capelaValue,
          "No existe coincidencia en la colección chapels"
        )
      );
      return;
    }

    matchesFound += 1;

    if (!existingChapelId) {
      serversNeedingUpdate += 1;
      return;
    }

    if (existingChapelId !== matchedChapelId) {
      serversNeedingUpdate += 1;
      issues.push(
        createServerIssue(
          server.id,
          capelaValue,
          `chapelId actual (${existingChapelId}) no coincide con el esperado (${matchedChapelId})`
        )
      );
    }
  });

  return {
    totalServers: servers.length,
    matchesFound,
    serversWithoutMatch: issues.filter((issue) =>
      issue.motivo === "Campo Capela vacío o ausente" ||
      issue.motivo === "No existe coincidencia en la colección chapels"
    ).length,
    serversWithChapelId,
    serversNeedingUpdate,
    issues
  };
}

async function readCollection(getDocs, collection, db, pathSegments) {
  const snapshot = await getDocs(collection(db, ...pathSegments));

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
}

async function runChapelIdAudit() {
  const {
    initializeApp,
    getAuth,
    signInAnonymously,
    getFirestore,
    collection,
    getDocs
  } = await loadFirebaseSdk();

  const firebaseConfig = getFirebaseConfig();
  const appId = getAuditAppId();
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  const [chapels, servers] = await Promise.all([
    readCollection(getDocs, collection, db, ["chapels"]),
    readCollection(getDocs, collection, db, ["artifacts", appId, "public", "data", "servers"])
  ]);

  const { nameToChapelId, duplicateNames } = buildChapelMap(chapels);
  const report = auditServers(servers, nameToChapelId);

  console.group("Auditoría chapelId");
  console.info("appId:", appId);
  console.info("Capillas leídas:", chapels.length);
  console.info("Servidores leídos:", report.totalServers);
  console.info("Coincidencias encontradas:", report.matchesFound);
  console.info("Servidores sin coincidencia:", report.serversWithoutMatch);
  console.info("Servidores que ya poseen chapelId:", report.serversWithChapelId);
  console.info("Servidores que necesitarán actualización:", report.serversNeedingUpdate);
  console.groupEnd();

  if (duplicateNames.length > 0) {
    console.group("Capillas con problemas de mapeo");
    console.table(duplicateNames);
    console.groupEnd();
  }

  if (report.issues.length > 0) {
    console.group("Servidores con incidencias");
    console.table(report.issues);
    console.groupEnd();
  } else {
    console.info("No se detectaron incidencias en la auditoría.");
  }

  return {
    appId,
    chapels,
    servers,
    duplicateNames,
    report
  };
}

globalThis.runChapelIdAudit = runChapelIdAudit;

if (typeof window !== "undefined") {
  console.info("Script de auditoría cargado. Ejecuta runChapelIdAudit() para iniciar.");
}
