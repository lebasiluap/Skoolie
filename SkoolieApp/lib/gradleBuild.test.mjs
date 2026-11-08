import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const require = createRequire(import.meta.url)
const { withDownloadTimeout } = require('../scripts/prepare-android-gradle.cjs')

test('Gradle timeout increases without changing download integrity or version', () => {
  const input = 'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.3-bin.zip\nnetworkTimeout=10000\nvalidateDistributionUrl=true\ndistributionSha256Sum=existing\n'
  const output = withDownloadTimeout(input)
  assert.equal(output, input.replace('networkTimeout=10000', 'networkTimeout=120000'))
  assert.equal(withDownloadTimeout(output), output)
  assert.equal(withDownloadTimeout(input.replace('10000','180000')), input.replace('10000','180000'))
  assert.equal(withDownloadTimeout('validateDistributionUrl=true'), 'validateDistributionUrl=true\nnetworkTimeout=120000\n')
  assert.throws(() => withDownloadTimeout('networkTimeout=0\n'))
  assert.throws(() => withDownloadTimeout('networkTimeout=abc\n'))
  assert.throws(() => withDownloadTimeout('networkTimeout=10000\nnetworkTimeout=20000\n'))
})

test('iOS and local installs do not read or change Android files', () => {
  const script = new URL('../scripts/prepare-android-gradle.cjs', import.meta.url)
  for (const platform of ['ios', '']) {
    const result = spawnSync(process.execPath, [script.pathname], { env: { ...process.env, EAS_BUILD_PLATFORM: platform }, encoding:'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout, '')
  }
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url),'utf8'))
  assert.equal(pkg.scripts['eas-build-post-install'], 'node scripts/prepare-android-gradle.cjs')
})

test('Android hook patches the generated wrapper and is idempotent', () => {
  const root = mkdtempSync(join(tmpdir(), 'skoolie-gradle-test-'))
  try {
    mkdirSync(join(root,'scripts'))
    mkdirSync(join(root,'android/gradle/wrapper'), { recursive:true })
    const script = join(root,'scripts/prepare-android-gradle.cjs')
    copyFileSync(new URL('../scripts/prepare-android-gradle.cjs', import.meta.url), script)
    const file = join(root,'android/gradle/wrapper/gradle-wrapper.properties')
    const input = 'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.3-bin.zip\n\nnetworkTimeout=10000\nvalidateDistributionUrl=true\n'
    writeFileSync(file,input)
    for (let i=0;i<2;i++) {
      const result = spawnSync(process.execPath,[script], { env: { ...process.env, EAS_BUILD_PLATFORM:'android' }, encoding:'utf8' })
      assert.equal(result.status,0,result.stderr)
      assert.equal(readFileSync(file,'utf8'),input.replace('10000','120000'))
    }
  } finally { rmSync(root,{ recursive:true, force:true }) }
})
