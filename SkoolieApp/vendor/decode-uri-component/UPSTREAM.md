# Patched URL decoder compatibility

Source: official npm decode-uri-component@0.5.1, https://github.com/SamVerschueren/decode-uri-component, git commit 58ed85f5adc7cfaee5e49e4d52b067f172d0bcb6.

Tarball SHA-1: 7f66b25bf435df723f9af55713dcf860a1c297d2. The only algorithm-file change is replacing `export default function` with `module.exports = function` and adding provenance comments. This preserves query-string 7's synchronous CommonJS API without retaining the vulnerable recursive decoder or forcing an Expo Router major upgrade. Keep the upstream MIT license. Regression tests verify the algorithm matches the official tarball source after this mechanical transformation.
