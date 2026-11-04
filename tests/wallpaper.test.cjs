const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/renderer/src/lib/wallpaper.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const compiledModule = new Module(sourcePath, module)
compiledModule._compile(compiled, sourcePath)
const { wallpaperPalette } = compiledModule.exports

test('wallpaper panels use a dark tint sampled from the visible pixels', () => {
  const result = wallpaperPalette(new Uint8ClampedArray([
    255, 0, 0, 255,
    0, 0, 255, 255,
    0, 255, 0, 0,
  ]))
  assert.deepEqual(result, {
    panel: 'rgba(46, 20, 46, 0.88)',
    edge: 'rgb(64, 28, 64)',
  })
})

test('transparent image uses safe dark defaults', () => {
  assert.deepEqual(wallpaperPalette(new Uint8ClampedArray([255, 255, 255, 0])), {
    panel: 'rgba(20, 18, 28, 0.88)',
    edge: 'rgb(28, 25, 38)',
  })
})
