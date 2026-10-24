# Metro image-size compatibility

Uses the official, integrity-pinned npm `image-size@2.0.4` under the alias
`image-size-upstream`. No parser code is copied or modified. The adapter only
reads a local build-asset file when given a file path, then delegates its bytes
to the fixed parser. Metro 0.83's getAssetData still uses that synchronous
file-path API, which upstream 2.x removed. Buffer calls are delegated unchanged.
This adapter is build tooling, not bundled application code. The supported
interfaces are Metro's file-path/Buffer calls and disableTypes/types exports.
