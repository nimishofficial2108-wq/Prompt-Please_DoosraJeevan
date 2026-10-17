import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const neuro = join(root, 'modules/neuro');

test('NeuroScan entry points exist', () => {
  for (const file of [
    'index.html',
    'package.json',
    'src/App.tsx',
    'src/main.tsx',
    'server.ts'
  ]) {
    assert.ok(existsSync(join(neuro, file)), `Missing: ${file}`);
  }
});

test('NeuroScan medical imaging utilities exist', () => {
  for (const file of [
    'src/utils/dicomParser.ts',
    'src/utils/niftiParser.ts',
    'src/utils/sliceRenderer.ts',
    'src/utils/triageEngine.ts'
  ]) {
    assert.ok(existsSync(join(neuro, file)), `Missing: ${file}`);
  }
});

test('NeuroScan workstation components exist', () => {
  for (const file of [
    'src/components/FourScreenViewport.tsx',
    'src/components/SliceViewport.tsx',
    'src/components/UploadPatientModal.tsx',
    'src/components/WindowLevelControls.tsx'
  ]) {
    assert.ok(existsSync(join(neuro, file)), `Missing: ${file}`);
  }
});

test('NeuroScan package has a development script', () => {
  const pkg = JSON.parse(
    readFileSync(join(neuro, 'package.json'), 'utf8')
  );

  assert.ok(pkg.scripts?.dev, 'Missing development script');
});

test('NeuroScan preloader assets exist', () => {
  for (const file of [
    'public/doosra-preloader.css',
    'public/doosra-preloader.js'
  ]) {
    assert.ok(existsSync(join(neuro, file)), `Missing: ${file}`);
  }
});
