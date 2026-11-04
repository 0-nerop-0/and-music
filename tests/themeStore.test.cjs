const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const values = new Map()
values.set('mei-music-theme', JSON.stringify({ state: { wallpaperFit: 'cover' }, version: 0 }))
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
})

const sourcePath = path.join(__dirname, '../src/renderer/src/stores/themeStore.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const compiledModule = new Module(sourcePath, module)
compiledModule.filename = sourcePath
compiledModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
compiledModule._compile(compiled, sourcePath)
const store = compiledModule.exports.useThemeStore

test('existing wallpaper settings migrate to window fit', () => {
  assert.equal(store.getState().wallpaperFit, 'auto')
})

test('switching presets keeps the selected custom wallpaper available', () => {
  store.getState().setCustomWallpaper('file:///tmp/wallpaper.gif')
  store.getState().setWallpaper('aurora')
  store.getState().setWallpaper('custom')
  assert.equal(store.getState().customWallpaperData, 'file:///tmp/wallpaper.gif')
  assert.match(store.getState().getWallpaper().value, /wallpaper\.gif/)
})

test('wallpaper fit is a persistent setting in the theme store', () => {
  store.getState().setWallpaperFit('contain')
  assert.equal(store.getState().wallpaperFit, 'contain')
  store.getState().setWallpaperFit('auto')
  assert.equal(store.getState().wallpaperFit, 'auto')
  store.getState().setWallpaperFit('cover')
  store.getState().importThemeJson('{"wallpaperFit":"auto"}')
  assert.equal(store.getState().wallpaperFit, 'auto')
})

test('exported theme keeps opacity and fit but omits the local wallpaper file', () => {
  store.getState().setCustomWallpaper('file:///tmp/wallpaper.gif', 'wallpaper.gif')
  store.getState().setWallpaperOpacity(0.25)
  const exported = JSON.parse(store.getState().exportThemeJson())
  assert.equal(exported.wallpaperId, 'none')
  assert.equal(exported.wallpaperOpacity, 0.25)
  assert.equal(exported.wallpaperFit, 'auto')
  assert.equal(exported.customWallpaperData, undefined)
  assert.equal(exported.customWallpaperName, undefined)
})
