const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/main/libraryScanner.ts')
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const loaded = new Module(sourcePath, module)
loaded.filename = sourcePath
loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath))
loaded._compile(compiled, sourcePath)
const { collectAudioFiles, stableTrackId } = loaded.exports

test('scanner discovers nested audio without including other files', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'and-music-scan-'))
  try {
    fs.mkdirSync(path.join(root, 'album'))
    fs.writeFileSync(path.join(root, 'album', 'song.mp3'), '')
    fs.writeFileSync(path.join(root, 'notes.txt'), '')
    const result = await collectAudioFiles(root)
    assert.deepEqual(result.files, [path.join(root, 'album', 'song.mp3')])
    assert.deepEqual(result.directories.sort(), [root, path.join(root, 'album')].sort())
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('track identity is stable for the same file', () => {
  assert.equal(stableTrackId('/music/a.mp3'), stableTrackId('/music/a.mp3'))
  assert.notEqual(stableTrackId('/music/a.mp3'), stableTrackId('/music/b.mp3'))
})
