const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const track = (name) => ({ id: name.charCodeAt(0), path: `/music/${name}.mp3`, title: name, artist: '', album: '', duration: 1, volume: 1, coverData: 'data:image/png;base64,large' })
const values = new Map([['mei-music-player', JSON.stringify({ state: { queue: [track('a')], currentIndex: 0, playing: true, shuffle: true }, version: 0 })]])
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
} })

Module._extensions['.ts'] = (loaded, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  loaded._compile(compiled, filename)
}
const store = require(path.join(__dirname, '../src/renderer/src/stores/playerStore.ts')).usePlayerStore

test('saved queue restores paused and queue additions exclude cover images from storage', () => {
  assert.equal(store.getState().queue[0].path, '/music/a.mp3')
  assert.equal(store.getState().playing, false)
  assert.equal(store.getState().shuffle, true)
  store.getState().enqueueTrack(track('b'), 'next')
  assert.deepEqual(store.getState().queue.map((item) => item.title), ['a', 'b'])
  const saved = JSON.parse(values.get('mei-music-player'))
  assert.equal(saved.state.queue[1].coverData, undefined)
})

test('next and previous actions expose the visual slide direction', () => {
  globalThis.window = {
    api: {
      readAudioFile: () => new Promise(() => {}),
      getMetadata: async () => null,
    },
  }
  store.getState().playNext()
  assert.equal(store.getState().changeDirection, 'next')
  store.getState().playPrev()
  assert.equal(store.getState().changeDirection, 'prev')
})
