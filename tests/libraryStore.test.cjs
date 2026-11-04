const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const values = new Map([['mei-music-library', JSON.stringify({
  version: 0,
  state: { folder: '/music/old', tracks: [{ id: 1, path: '/music/old/a.mp3', title: 'A', artist: '', album: '', duration: 1, volume: 1 }] },
})]])
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
} })

const sourcePath = path.join(__dirname, '../src/renderer/src/stores/libraryStore.ts')
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const loaded = new Module(sourcePath, module)
loaded.filename = sourcePath
loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath))
loaded._compile(compiled, sourcePath)
const store = loaded.exports.useLibraryStore

const track = (path, id) => ({ id, path, title: path, artist: '', album: '', duration: 1, volume: 1 })

test('legacy library folder is retained after migration', () => {
  assert.deepEqual(store.getState().folders, ['/music/old'])
  assert.equal(store.getState().tracks.length, 1)
})

test('folder updates merge and deduplicate tracks by path', () => {
  store.getState().updateFolder('/music/new', [track('/music/new/b.mp3', 2), track('/music/new/b.mp3', 3)])
  assert.deepEqual(store.getState().folders, ['/music/old', '/music/new'])
  assert.equal(store.getState().tracks.length, 2)
  store.getState().updateFolder('/music/old', [track('/music/old/c.mp3', 4)])
  assert.deepEqual(store.getState().tracks.map((item) => item.path).sort(), ['/music/new/b.mp3', '/music/old/c.mp3'])
})

test('removing one folder preserves tracks from other folders', () => {
  store.getState().removeFolder('/music/old')
  assert.deepEqual(store.getState().folders, ['/music/new'])
  assert.deepEqual(store.getState().tracks.map((item) => item.path), ['/music/new/b.mp3'])
})
