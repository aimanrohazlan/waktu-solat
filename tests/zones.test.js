import { test } from "node:test";
import assert from "node:assert/strict";
import { ZONES, STATES, findZone } from "../js/zones.js";

test("zone list shape", () => {
  assert.equal(ZONES.length, 60);
  assert.equal(new Set(ZONES.map((z) => z.code)).size, 60);
  for (const z of ZONES) {
    assert.match(z.code, /^[A-Z]{3}\d{2}$/);
    assert.ok(STATES.includes(z.state), z.state);
  }
  assert.equal(STATES.length, 14);
});

test("findZone", () => {
  assert.equal(findZone("WLY01").name, "Kuala Lumpur, Putrajaya");
  assert.equal(findZone("XXX99"), undefined);
});
