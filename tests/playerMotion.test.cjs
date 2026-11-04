const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/renderer/src/lib/playerMotion.ts')
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const loaded = new Module(sourcePath, module)
loaded._compile(compiled, sourcePath)
const { coverStartTransform } = loaded.exports

test('large cover starts at the thumbnail position and size', () => {
  const thumbnail = { left: 20, top: 720, width: 48, height: 48 }
  const large = { left: 420, top: 180, width: 360, height: 360 }
  assert.equal(coverStartTransform(thumbnail, large), 'translate3d(-556px, 384px, 0) scale(0.1333, 0.1333)')
})

test('missing source uses a small centered entrance', () => {
  assert.equal(coverStartTransform(null, { left: 0, top: 0, width: 360, height: 360 }), 'translate3d(0px, 24px, 0) scale(0.92, 0.92)')
})
