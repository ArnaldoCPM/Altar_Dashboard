"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { _test } = require("../index.js");

test("normalizes the pending-profile address consistently", () => {
  assert.equal(_test.normalizeEmail("  User@Example.TEST "), "user@example.test");
});

test("only password provider is eligible for a reset email", () => {
  assert.equal(_test.hasPasswordProvider({ providerData: [{ providerId: "password" }] }), true);
  assert.equal(_test.hasPasswordProvider({ providerData: [{ providerId: "google.com" }] }), false);
});

test("active authorization profiles require a valid role and chapel when applicable", () => {
  assert.equal(_test.hasValidProfile({ active: true, role: "admin" }), true);
  assert.equal(_test.hasValidProfile({ active: true, role: "viewer", chapelId: "chapel-a" }), true);
  assert.equal(_test.hasValidProfile({ active: false, role: "viewer", chapelId: "chapel-a" }), false);
  assert.equal(_test.hasValidProfile({ active: true, role: "viewer" }), false);
});
