"use strict";

const { randomBytes } = require("crypto");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

if (!getApps().length) initializeApp();
const db = getFirestore();
const auth = getAuth();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hasValidProfile(profile) {
  if (!profile || profile.active !== true || !["admin", "coordinator", "viewer"].includes(profile.role)) return false;
  return profile.role === "admin" || typeof profile.chapelId === "string" && profile.chapelId.length > 0;
}

function hasPasswordProvider(userRecord) {
  return userRecord.providerData.some((provider) => provider.providerId === "password");
}

async function findPendingProfile(email) {
  const normalized = normalizeEmail(email);
  // This transition-only scan supports legacy pending IDs and mixed-case stored emails.
  const snapshot = await db.collection("users").get();
  const candidates = snapshot.docs.filter((document) => {
    const profile = document.data();
    const hasNoUid = profile.uid === null || profile.uid === undefined || profile.uid === "";
    return hasNoUid && (normalizeEmail(document.id) === normalized || normalizeEmail(profile.email) === normalized);
  });
  if (candidates.length > 1) {
    throw new HttpsError("failed-precondition", "Ambiguous pending profile.");
  }
  return candidates[0] || null;
}

async function getAuthUserByEmail(email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  }
}

function generatedInternalPassword() {
  // Never return, log, or persist this value outside Firebase Authentication.
  return randomBytes(32).toString("base64url");
}

async function requireActiveAdmin(uid) {
  const profile = (await db.doc(`users/${uid}`).get()).data();
  if (!profile || profile.active !== true || profile.role !== "admin") {
    throw new HttpsError("permission-denied", "Not authorized.");
  }
}

async function consolidatePendingProfile(pending, userRecord, email) {
  const canonicalRef = db.doc(`users/${userRecord.uid}`);
  const pendingRef = pending.ref;
  const pendingProfile = pending.data();
  await db.runTransaction(async (transaction) => {
    const canonical = await transaction.get(canonicalRef);
    if (canonical.exists) {
      // A second profile for the same Auth identity is unsafe to merge implicitly.
      throw new HttpsError("failed-precondition", "Canonical profile already exists.");
    }
    transaction.set(canonicalRef, {
      ...pendingProfile,
      uid: userRecord.uid,
      email,
      status: "active",
      updatedAt: FieldValue.serverTimestamp()
    });
    transaction.delete(pendingRef);
  });
}

exports.sendUserAccess = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");
  await requireActiveAdmin(request.auth.uid);

  const email = normalizeEmail(request.data?.email);
  if (!email || !email.includes("@")) throw new HttpsError("invalid-argument", "A valid email is required.");

  const pending = await findPendingProfile(email);
  let userRecord = await getAuthUserByEmail(email);

  if (pending) {
    const profile = pending.data();
    if (!hasValidProfile(profile)) throw new HttpsError("failed-precondition", "Profile is not eligible.");
    if (!userRecord) {
      userRecord = await auth.createUser({ email, password: generatedInternalPassword(), displayName: profile.displayName || undefined });
    }
    await consolidatePendingProfile(pending, userRecord, email);
  } else {
    if (!userRecord) throw new HttpsError("not-found", "No eligible profile.");
    const canonical = (await db.doc(`users/${userRecord.uid}`).get()).data();
    if (!hasValidProfile(canonical) || normalizeEmail(canonical.email) !== email) {
      throw new HttpsError("failed-precondition", "Profile is not eligible.");
    }
  }

  return { passwordResetEligible: hasPasswordProvider(userRecord) };
});

exports._test = { hasPasswordProvider, hasValidProfile, normalizeEmail };
