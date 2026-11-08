const fs = require('node:fs')
const path = require('node:path')

// Build infrastructure only: Expo runs this after Android prebuild. Keep the
// official distribution URL and validation untouched; allow a slow download.
function withDownloadTimeout(properties) {
  const entries = properties.split(/\r?\n/).filter(line => /^[ \t]*networkTimeout[ \t]*[=:]/.test(line))
  if (entries.length > 1) throw new Error('Duplicate Gradle networkTimeout properties')
  if (entries.length) {
    const value = Number(entries[0].split(/[=:]/).slice(1).join(':').trim())
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid Gradle networkTimeout')
    if (value >= 120000) return properties
    return properties.replace(/^[ \t]*networkTimeout[ \t]*[=:].*$/m, 'networkTimeout=120000')
  }
  return properties + (properties.endsWith('\n') ? '' : '\n') + 'networkTimeout=120000\n'
}

if (require.main === module && process.env.EAS_BUILD_PLATFORM === 'android') {
  const file = path.join(__dirname, '..', 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties')
  const original = fs.readFileSync(file, 'utf8')
  const updated = withDownloadTimeout(original)
  if (updated !== original) fs.writeFileSync(file, updated)
  console.log('Android Gradle distribution timeout configured; URL and validation unchanged.')
}

module.exports = { withDownloadTimeout }
