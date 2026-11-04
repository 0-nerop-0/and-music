const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/renderer/src/lib/queue.ts')
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const loaded = new Module(sourcePath, module)
loaded._compile(compiled, sourcePath)
const { insertInQueue } = loaded.exports

test('play next inserts after current track', () => {
  assert.deepEqual(insertInQueue(['a', 'b', 'c'], 0, 'x', 'next'), ['a', 'x', 'b', 'c'])
})

test('queue end appends and empty queue can accept next', () => {
  assert.deepEqual(insertInQueue(['a', 'b'], 0, 'x', 'end'), ['a', 'b', 'x'])
  assert.deepEqual(insertInQueue([], -1, 'x', 'next'), ['x'])
})
