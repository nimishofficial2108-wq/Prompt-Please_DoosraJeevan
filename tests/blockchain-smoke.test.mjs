import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const blockchain = join(root, "modules/blockchain");

test("Blockchain contracts and deployment files exist", () => {
  for (const file of [
    "contracts/DoosraLedger.sol",
    "contracts/PatientIdentityToken.sol",
    "hardhat.config.js",
    "scripts/deploy.js",
    "package.json"
  ]) {
    assert.ok(existsSync(join(blockchain, file)), `Missing: ${file}`);
  }
});

test("Blockchain deployment script is configured", () => {
  const pkg = JSON.parse(
    readFileSync(join(blockchain, "package.json"), "utf8")
  );
  assert.ok(
    Object.keys(pkg.scripts || {}).some(name => /deploy/i.test(name)),
    "Missing deployment script"
  );
});

test("Local blockchain smoke test passes", { timeout: 120000 }, () => {
  const pkg = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8")
  );
  assert.ok(pkg.scripts?.["chain:smoke"], "Missing chain:smoke script");

  const result = spawnSync("npm", ["run", "chain:smoke"], {
    cwd: root,
    encoding: "utf8",
    timeout: 110000,
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);

  assert.ifError(result.error);
  assert.equal(result.status, 0, "Blockchain smoke test failed");
});
