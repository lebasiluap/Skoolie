// Metro 0.83 calls both the legacy synchronous file-path API and Buffer API.
// Keep those interfaces; all image parsing comes from official patched 2.0.4.
const { readFileSync } = require('node:fs')
const upstream = require('image-size-upstream')
function imageSize(input) {
  return upstream.imageSize(typeof input === 'string' ? readFileSync(input) : input)
}
module.exports = Object.assign(imageSize, {
  imageSize,
  default: imageSize,
  disableTypes: upstream.disableTypes,
  types: upstream.types,
})
