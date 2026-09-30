import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
const root = resolve(import.meta.dirname, 'dist/client')
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' }
createServer(async (req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(req.url === '/' ? '/index.html' : req.url))
  if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return }
  try { const data = await readFile(path); res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }); res.end(data) }
  catch { res.writeHead(404).end() }
}).listen(4173, '127.0.0.1', () => console.log('Preview http://127.0.0.1:4173'))
