const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createHash } = require('node:crypto')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const decode = require('../vendor/decode-uri-component')

test('vendored algorithm equals official 0.5.1 with export-only adaptation', () => {
  const source = readFileSync(path.join(root, 'vendor/decode-uri-component/index.cjs'), 'utf8')
    .split('\n').slice(2).join('\n')
    .replace('module.exports = function decodeUriComponent', 'export default function decodeUriComponent')
  assert.equal(createHash('sha256').update(source).digest('hex'),
    '6a86ac891edf15c5efa0841ebb31935e3669d58b98318b57d7b08a4530317cb0')
})

test('router CommonJS query parser retains Unicode, spaces and malformed-input support', () => {
  const query = require('../node_modules/query-string')
  assert.equal(decode('%C3%A5%20%F0%9F%93%9A'), 'å 📚')
  assert.equal(query.parse('name=Paul%20Saint%20Omer&topic=Heart%20%26%20Lung').name, 'Paul Saint Omer')
  assert.equal(query.parse('topic=Heart%20%26%20Lung').topic, 'Heart & Lung')
  for (const input of ['%', '%G1', '%C2', '%FE%FF', '%E0%A4%A', '%FF%41']) {
    assert.equal(typeof decode(input), 'string')
    assert.doesNotThrow(() => query.parse(`bad=${input}`))
  }
})

test('long malformed input completes within a bounded subprocess', () => {
  const result = spawnSync(process.execPath, ['-e',
    "const d=require('./vendor/decode-uri-component'); const s='%FF%C2%41'.repeat(20000); if(typeof d(s)!=='string') process.exit(1)"],
  { cwd: root, timeout: 3000, encoding: 'utf8' })
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
})

test('both installed Metro versions retain patched PNG dimension support', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR5mP8/x8AAwMCAO+j5uoAAAAASUVORK5CYII=', 'base64')
  for (const relative of ['node_modules/metro/src/Assets.js', 'node_modules/@expo/metro/node_modules/metro/src/Assets.js']) {
    const assets = require(path.join(root, relative))
    assert.deepEqual(assets.getAssetSize('png', png, 'fixture.png'), { width: 1, height: 1 })
  }
})

test('Metro getAssetData retains the synchronous file-path API used in full builds', async () => {
  for (const relative of ['node_modules/metro/src/Assets.js', 'node_modules/@expo/metro/node_modules/metro/src/Assets.js']) {
    const assets = require(path.join(root, relative))
    const asset = await assets.getAssetData(path.join(root, 'node_modules/expo-router/assets/unmatched.png'), 'assets/unmatched.png', [], 'ios', '/assets')
    assert.equal(asset.width, 436)
    assert.equal(asset.height, 266)
  }
})
