async function loadFirebaseSdk() {
  const [
    { initializeApp },
    { getFirestore, collection, doc, getDocs, writeBatch }
  ] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
  ]);

  return {
    initializeApp,
    getFirestore,
    collection,
    doc,
    getDocs,
    writeBatch
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

function getExistingChapelId(server) {
  return server.chapelId || server.capela_id || server.capelaId || null;
}

function buildServerMigrationPlan(servers, chapelMap) {
  const issues = [];
  const updates = [];
  let matchesFound = 0;
  let serversWithChapelId = 0;

  servers.forEach((server) => {
    const capelaValue = (server.Capela || "").toString().trim();
    const normalizedCapela = normalizeChapelName(capelaValue);
    const matchedChapelId = chapelMap.get(normalizedCapela) || null;
    const existingChapelId = getExistingChapelId(server);

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
      updates.push({
        id: server.id,
        currentChapelId: null,
        targetChapelId: matchedChapelId,
        Capela: capelaValue
      });
      return;
    }

    if (existingChapelId !== matchedChapelId) {
      updates.push({
        id: server.id,
        currentChapelId: existingChapelId,
        targetChapelId: matchedChapelId,
        Capela: capelaValue
      });
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
    serversNeedingUpdate: updates.length,
    issues,
    updates
  };
}

function printAuditResult({ appId, chapels, duplicateNames, report }) {
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
}

async function readCollection(getDocs, collection, db, pathSegments) {
  const snapshot = await getDocs(collection(db, ...pathSegments));

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
}

async function initAuditContext() {
  const {
    initializeApp,
    getFirestore,
    collection,
    doc,
    getDocs,
    writeBatch
  } = await loadFirebaseSdk();

  const firebaseConfig = getFirebaseConfig();
  const appId = getAuditAppId();
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  return {
    appId,
    db,
    collection,
    doc,
    getDocs,
    writeBatch
  };
}

async function collectAuditData() {
  const context = await initAuditContext();
  const { appId, db, collection, getDocs } = context;

  const [chapels, servers] = await Promise.all([
    readCollection(getDocs, collection, db, ["chapels"]),
    readCollection(getDocs, collection, db, ["artifacts", appId, "public", "data", "servers"])
  ]);

  const { nameToChapelId, duplicateNames } = buildChapelMap(chapels);
  const report = buildServerMigrationPlan(servers, nameToChapelId);

  return {
    ...context,
    chapels,
    servers,
    duplicateNames,
    chapelMap: nameToChapelId,
    report
  };
}

async function runChapelIdAudit() {
  const result = await collectAuditData();

  printAuditResult(result);

  return {
    appId: result.appId,
    chapels: result.chapels,
    servers: result.servers,
    duplicateNames: result.duplicateNames,
    report: result.report
  };
}

async function commitMigrationBatches(db, doc, writeBatch, appId, updates) {
  const errors = [];
  const batchSize = 400;
  let updatedCount = 0;

  for (let index = 0; index < updates.length; index += batchSize) {
    const chunk = updates.slice(index, index + batchSize);
    const batch = writeBatch(db);

    chunk.forEach((updateItem) => {
      const serverDocRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "servers",
        updateItem.id
      );

      batch.update(serverDocRef, {
        chapelId: updateItem.targetChapelId
      });
    });

    try {
      await batch.commit();
      updatedCount += chunk.length;
    } catch (error) {
      chunk.forEach((updateItem) => {
        errors.push({
          id: updateItem.id,
          Capela: updateItem.Capela,
          motivo: error.message
        });
      });
    }
  }

  return {
    updatedCount,
    errors
  };
}

async function runChapelIdMigration(options = {}) {
  if (!options || options.confirm !== true) {
    console.warn(
      "Migración no ejecutada. Usa runChapelIdMigration({ confirm: true }) para confirmar."
    );

    return {
      executed: false,
      reason: "confirmation_required"
    };
  }

  const auditResult = await collectAuditData();
  const { appId, db, doc, writeBatch, duplicateNames, report } = auditResult;

  console.group("Migración chapelId");
  console.info("appId:", appId);
  console.info("Documentos candidatos a actualización:", report.updates.length);
  console.groupEnd();

  if (duplicateNames.length > 0) {
    console.warn(
      "Se detectaron nombres duplicados en chapels. La migración continuará solo con coincidencias unívocas."
    );
  }

  if (report.updates.length === 0) {
    console.info("No hay documentos para actualizar. Se ejecutará auditoría final.");
    const finalAudit = await runChapelIdAudit();

    return {
      executed: true,
      appId,
      toUpdate: 0,
      updatedCount: 0,
      errors: [],
      finalAudit
    };
  }

  const migrationResult = await commitMigrationBatches(
    db,
    doc,
    writeBatch,
    appId,
    report.updates
  );

  console.group("Resultado migración chapelId");
  console.info("Documentos a actualizar:", report.updates.length);
  console.info("Documentos actualizados:", migrationResult.updatedCount);
  console.info("Errores:", migrationResult.errors.length);
  console.groupEnd();

  if (migrationResult.errors.length > 0) {
    console.group("Errores de migración");
    console.table(migrationResult.errors);
    console.groupEnd();
  }

  const finalAudit = await runChapelIdAudit();

  return {
    executed: true,
    appId,
    toUpdate: report.updates.length,
    updatedCount: migrationResult.updatedCount,
    errors: migrationResult.errors,
    finalAudit
  };
}

globalThis.runChapelIdAudit = runChapelIdAudit;
globalThis.runChapelIdMigration = runChapelIdMigration;

if (typeof window !== "undefined") {
  console.info(
    "Script de auditoría cargado. Ejecuta runChapelIdAudit() para auditar o runChapelIdMigration({ confirm: true }) para migrar."
  );
}
