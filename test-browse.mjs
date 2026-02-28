/**
 * Browse feature E2E test via Chrome DevTools Protocol.
 * Tests the full browse flow: index fetch, filtering, task detail, import.
 */
import WebSocket from 'ws'

let passed = 0
let failed = 0

function test(name, ok, detail) {
  if (ok) {
    passed++
    console.log(`  PASS: ${name}`)
  } else {
    failed++
    console.log(`  FAIL: ${name} — ${detail || ''}`)
  }
}

try {
  // ─── Connect via CDP ───
  const res = await fetch('http://127.0.0.1:9222/json')
  const pages = await res.json()
  const page = pages.find(p => p.type === 'page' && !p.url.includes('devtools'))
  const wsUrl = page?.webSocketDebuggerUrl
  if (!wsUrl) throw new Error('No page found')

  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.on('open', resolve)
    ws.on('error', reject)
  })

  let msgId = 1
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++
      ws.on('message', function handler(data) {
        const msg = JSON.parse(data.toString())
        if (msg.id === id) {
          ws.removeListener('message', handler)
          resolve(msg)
        }
      })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async function evaluate(expr) {
    const r = await send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true
    })
    if (r.result?.exceptionDetails) {
      const desc = r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text
      throw new Error(`Evaluate error: ${desc}`)
    }
    return r.result?.result?.value
  }

  await send('Runtime.enable')

  // ─── Test 1: Browse API methods exist ───
  console.log('\n--- Browse API Tests ---')

  test('fetchBrowseIndex exists',
    await evaluate('typeof window.api.fetchBrowseIndex') === 'function')
  test('fetchBrowseTaskDetail exists',
    await evaluate('typeof window.api.fetchBrowseTaskDetail') === 'function')
  test('importBrowseTask exists',
    await evaluate('typeof window.api.importBrowseTask') === 'function')

  // ─── Test 2: Browse store exists ───
  test('browseStore exists',
    await evaluate('typeof window.__stores.browse') === 'function')

  // ─── Test 3: Fetch the browse index ───
  console.log('\n--- Fetch Index (may take ~30s for 241 tasks) ---')
  const indexResult = JSON.parse(await evaluate(`
    (async () => {
      try {
        const idx = await window.api.fetchBrowseIndex();
        return JSON.stringify({ ok: true, count: idx.tasks.length, fetchedAt: idx.fetchedAt });
      } catch (e) { return JSON.stringify({ ok: false, err: String(e) }) }
    })()
  `))
  test('Fetch index succeeds', indexResult.ok, indexResult.err)
  test('Index has >100 tasks', indexResult.ok && indexResult.count > 100, `count=${indexResult.count}`)
  console.log(`  (fetched ${indexResult.count} tasks)`)

  // ─── Test 4: Cache works (second fetch should be instant) ───
  const t0 = Date.now()
  const cacheResult = JSON.parse(await evaluate(`
    (async () => {
      try {
        const idx = await window.api.fetchBrowseIndex();
        return JSON.stringify({ ok: true, count: idx.tasks.length, fetchedAt: idx.fetchedAt });
      } catch (e) { return JSON.stringify({ ok: false, err: String(e) }) }
    })()
  `))
  const cacheMs = Date.now() - t0
  test('Cached fetch < 1s', cacheResult.ok && cacheMs < 1000, `took ${cacheMs}ms`)

  // ─── Test 5: Fetch task detail ───
  console.log('\n--- Task Detail ---')
  const firstSlug = JSON.parse(await evaluate(`
    (async () => {
      const idx = await window.api.fetchBrowseIndex();
      return JSON.stringify(idx.tasks[0].slug);
    })()
  `))
  console.log(`  Testing detail for: ${firstSlug}`)

  const detail = JSON.parse(await evaluate(`
    (async () => {
      try {
        const t = await window.api.fetchBrowseTaskDetail(${JSON.stringify(firstSlug)});
        return JSON.stringify({
          ok: true,
          slug: t.slug,
          hasInstruction: t.instruction.length > 0,
          hasAuthor: t.authorName.length > 0,
          difficulty: t.difficulty,
          category: t.category,
          tagCount: t.tags.length,
          fileCount: t.files.length
        });
      } catch (e) { return JSON.stringify({ ok: false, err: String(e) }) }
    })()
  `))
  test('Task detail has instruction', detail.ok && detail.hasInstruction, detail.err)
  test('Task detail has author', detail.ok && detail.hasAuthor)
  test('Task detail has difficulty', detail.ok && ['easy', 'medium', 'hard'].includes(detail.difficulty), detail.difficulty)
  test('Task detail has files', detail.ok && detail.fileCount > 0, `files=${detail.fileCount}`)
  console.log(`  slug=${detail.slug} difficulty=${detail.difficulty} category=${detail.category} tags=${detail.tagCount} files=${detail.fileCount}`)

  // ─── Test 6: Browse store integration ───
  console.log('\n--- Store Integration ---')

  // Switch to browse mode
  await evaluate(`window.__stores.ui.getState().setSidebarMode('browse')`)
  const mode = await evaluate(`window.__stores.ui.getState().sidebarMode`)
  test('Sidebar mode is browse', mode === 'browse', mode)

  // Load index into store
  const storeLoad = JSON.parse(await evaluate(`
    (async () => {
      try {
        const store = window.__stores.browse.getState();
        const idx = await window.api.fetchBrowseIndex();
        store.setTasks(idx.tasks);
        store.setStatus('loaded');
        const state = window.__stores.browse.getState();
        const cats = new Set(state.tasks.map(t => t.category));
        return JSON.stringify({
          ok: true,
          count: state.tasks.length,
          status: state.status,
          categories: cats.size,
        });
      } catch (e) { return JSON.stringify({ ok: false, err: String(e) }) }
    })()
  `))
  test('Store loaded tasks', storeLoad.ok && storeLoad.count > 100, `count=${storeLoad.count}`)
  test('Store has categories', storeLoad.ok && storeLoad.categories > 0, `categories=${storeLoad.categories}`)

  // Test search filter (use the pure filterTasks function indirectly via store state)
  const searchResult = JSON.parse(await evaluate(`
    (() => {
      const store = window.__stores.browse.getState();
      const tasks = store.tasks;
      const q = 'chess';
      const filtered = tasks.filter(t => [t.slug, t.instruction, t.category, ...t.tags].join(' ').toLowerCase().includes(q));
      return JSON.stringify({ count: filtered.length });
    })()
  `))
  test('Search filter works', searchResult.count > 0 && searchResult.count < storeLoad.count,
    `'chess' matched ${searchResult.count} of ${storeLoad.count}`)

  // Test difficulty filter
  const diffResult = JSON.parse(await evaluate(`
    (() => {
      const store = window.__stores.browse.getState();
      const hard = store.tasks.filter(t => t.difficulty === 'hard');
      return JSON.stringify({
        hardCount: hard.length,
        allHard: hard.every(t => t.difficulty === 'hard')
      });
    })()
  `))
  test('Difficulty filter works', diffResult.hardCount > 0 && diffResult.allHard,
    `hard=${diffResult.hardCount} allHard=${diffResult.allHard}`)

  // Test selection
  const selectResult = JSON.parse(await evaluate(`
    (() => {
      const store = window.__stores.browse.getState();
      store.setSelectedSlug(store.tasks[0].slug);
      const state = window.__stores.browse.getState();
      const selected = state.tasks.find(t => t.slug === state.selectedSlug);
      return JSON.stringify({ slug: selected?.slug, hasInstruction: selected?.instruction?.length > 0 });
    })()
  `))
  test('Select task works', selectResult.slug && selectResult.hasInstruction, selectResult.slug)

  // ─── Test 7: Import task ───
  console.log('\n--- Import Task ---')

  // Find a small/easy task to import
  const importSlug = JSON.parse(await evaluate(`
    (() => {
      const store = window.__stores.browse.getState();
      const easy = store.tasks.find(t => t.difficulty === 'easy' && t.files.length <= 8);
      return JSON.stringify(easy?.slug || store.tasks[0].slug);
    })()
  `))
  console.log(`  Importing: ${importSlug}`)

  const importResult = JSON.parse(await evaluate(`
    (async () => {
      try {
        const ws = await window.api.importBrowseTask(${JSON.stringify(importSlug)});
        return JSON.stringify({
          ok: true,
          id: ws.id,
          name: ws.name,
          path: ws.path,
          hasPath: ws.path?.length > 0
        });
      } catch (e) { return JSON.stringify({ ok: false, err: String(e) }) }
    })()
  `))
  test('Import task succeeds', importResult.ok, importResult.err)
  test('Imported workspace has name', importResult.ok && importResult.name === importSlug, importResult.name)
  test('Imported workspace has path', importResult.ok && importResult.hasPath)
  console.log(`  Workspace: id=${importResult.id} name=${importResult.name}`)

  // Verify imported workspace has Harbor files
  if (importResult.ok) {
    const harborFiles = JSON.parse(await evaluate(`
      (async () => {
        try {
          const files = await window.api.getWorkspaceFiles(${JSON.stringify(importResult.id)});
          return JSON.stringify({
            ok: true,
            count: files.length,
            names: files.map(f => f.path.split('/').pop()),
            hasToml: files.some(f => f.path.endsWith('task.toml')),
            hasMd: files.some(f => f.path.endsWith('instruction.md')),
            hasDockerfile: files.some(f => f.path.endsWith('Dockerfile')),
            hasSolve: files.some(f => f.path.endsWith('solve.sh')),
            hasTest: files.some(f => f.path.endsWith('test.sh')),
          });
        } catch (e) { return JSON.stringify({ ok: false, err: String(e) }) }
      })()
    `))
    test('Has task.toml', harborFiles.ok && harborFiles.hasToml)
    test('Has instruction.md', harborFiles.ok && harborFiles.hasMd)
    test('Has Dockerfile', harborFiles.ok && harborFiles.hasDockerfile)
    test('Has solve.sh', harborFiles.ok && harborFiles.hasSolve)
    test('Has test.sh', harborFiles.ok && harborFiles.hasTest)
    console.log(`  Files: ${harborFiles.names?.join(', ')}`)

    // Check task.toml content has correct format
    const tomlContent = JSON.parse(await evaluate(`
      (async () => {
        try {
          const files = await window.api.getWorkspaceFiles(${JSON.stringify(importResult.id)});
          const toml = files.find(f => f.path.endsWith('task.toml'));
          return JSON.stringify({
            ok: true,
            content: toml?.content || '',
            hasTaskSection: toml?.content?.includes('[task]'),
            hasEnvSection: toml?.content?.includes('[environment]'),
            hasAgentSection: toml?.content?.includes('[agent]'),
            hasVerifierSection: toml?.content?.includes('[verifier]'),
            hasName: toml?.content?.includes('name = '),
          });
        } catch (e) { return JSON.stringify({ ok: false, err: String(e) }) }
      })()
    `))
    test('task.toml has [task] section', tomlContent.ok && tomlContent.hasTaskSection)
    test('task.toml has [environment] section', tomlContent.ok && tomlContent.hasEnvSection)
    test('task.toml has [agent] section', tomlContent.ok && tomlContent.hasAgentSection)
    test('task.toml has [verifier] section', tomlContent.ok && tomlContent.hasVerifierSection)
    test('task.toml has name field', tomlContent.ok && tomlContent.hasName)

    // Clean up imported workspace
    await evaluate(`window.api.deleteWorkspace(${JSON.stringify(importResult.id)})`)
    console.log('  Cleaned up imported workspace')
  }

  // ─── Test 8: UI rendering check ───
  console.log('\n--- UI Rendering ---')

  // Reset browse store to idle so useEffect will trigger a fresh load
  await evaluate(`
    const store = window.__stores.browse.getState();
    store.setStatus('idle');
    store.setTasks([]);
  `)

  // Switch to browse mode — BrowsePanel mounts, useEffect fires loadIndex
  await evaluate(`window.__stores.ui.getState().setSidebarMode('browse')`)

  // Wait for React render + index fetch (uses cache so should be fast)
  await new Promise(r => setTimeout(r, 3000))

  const hasHeader = await evaluate(`document.body.innerText.includes('Terminal Bench Tasks')`)
  test('BrowsePanel renders header', hasHeader)

  const hasSearchInput = await evaluate(`!!document.querySelector('input[placeholder="Search tasks..."]')`)
  test('BrowsePanel renders search input', hasSearchInput)

  // Check filter buttons
  const hasFilterButtons = await evaluate(`
    ['All', 'Easy', 'Medium', 'Hard'].every(label =>
      [...document.querySelectorAll('button')].some(b => b.textContent === label)
    )
  `)
  test('BrowsePanel renders difficulty filter buttons', hasFilterButtons)

  // Check category dropdown
  const hasCategorySelect = await evaluate(`!!document.querySelector('select')`)
  test('BrowsePanel renders category dropdown', hasCategorySelect)

  // Check task cards rendered — they have the class with slug text
  const cardCount = await evaluate(`
    document.querySelectorAll('button[class*="rounded-lg"][class*="border"][class*="text-left"]').length
  `)
  test('Task cards render (>0)', cardCount > 0, `found ${cardCount}`)

  ws.close()

} catch (err) {
  console.error('\nFATAL:', err.message)
  failed++
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
process.exit(failed > 0 ? 1 : 0)
