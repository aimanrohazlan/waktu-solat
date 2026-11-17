import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, loadSettings, saveSettings } from "../js/settings.js";
import { fakeStorage } from "./helpers/fakes.js";

test("defaults", () => {
  assert.deepEqual(DEFAULTS, { zone: "WLY01", fmt: "24" });
  assert.deepEqual(loadSettings(fakeStorage()), DEFAULTS);
});

test("loadSettings falls back on throwing/corrupt storage", () => {
  assert.deepEqual(loadSettings({ getItem() { throw new Error("denied"); } }), DEFAULTS);
  assert.deepEqual(loadSettings(fakeStorage({ "ws:settings": "{not json" })), DEFAULTS);
  assert.deepEqual(loadSettings(fakeStorage({ "ws:settings": "null" })), DEFAULTS);
  assert.deepEqual(
    loadSettings(fakeStorage({ "ws:settings": JSON.stringify({ lang: "ms", zone: "XXX99", fmt: "12" }) })),
    { zone: "WLY01", fmt: "12" });
});

test("saveSettings round-trip and swallow errors", () => {
  const s = fakeStorage();
  saveSettings({ zone: "SGR03", fmt: "12" }, s);
  assert.deepEqual(loadSettings(s), { zone: "SGR03", fmt: "12" });
  assert.doesNotThrow(() => saveSettings(DEFAULTS, { setItem() { throw new Error("full"); } }));
});
