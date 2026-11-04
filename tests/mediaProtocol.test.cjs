const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/main/mediaProtocol.ts')
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const loaded = new Module(sourcePath, module)
loaded.filename = sourcePath
loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath))
loaded._compile(compiled, sourcePath)
const { serveMedia } = loaded.exports

test('media response supports byte ranges for seeking', async () => {
  const file = path.join(os.tmpdir(), `and-music-media-${process.pid}.mp3`)
  fs.writeFileSync(file, '0123456789')
  try {
    const response = await serveMedia(new Request('https://example.test/audio', { headers: { Range: 'bytes=2-5' } }), file)
    assert.equal(response.status, 206)
    assert.equal(response.headers.get('content-range'), 'bytes 2-5/10')
    assert.equal(await response.text(), '2345')
  } finally { fs.rmSync(file, { force: true }) }
})

test('missing media returns 404 and malformed range returns 416', async () => {
  const file = path.join(os.tmpdir(), `and-music-media-${process.pid}.mp3`)
  fs.writeFileSync(file, 'abc')
  try {
    assert.equal((await serveMedia(new Request('https://example.test/audio', { headers: { Range: 'bytes=7-' } }), file)).status, 416)
  } finally { fs.rmSync(file, { force: true }) }
  assert.equal((await serveMedia(new Request('https://example.test/audio'), file)).status, 404)
})
