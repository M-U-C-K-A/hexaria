import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { buildItems } from './scripts/art/promptData';

// En dev, la page ?icon génère l'icône de l'app et l'envoie ici pour l'écrire sur disque.
function iconWriter(): Plugin {
  return {
    name: 'hexaria-icon-writer',
    configureServer(server) {
      server.middlewares.use('/__icon', (req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const b64 = Buffer.concat(chunks).toString().replace(/^data:image\/png;base64,/, '');
          writeFileSync('mac/icon-1024.png', Buffer.from(b64, 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

// En dev, la page art/prompts.html peut recevoir des images : elles sont enregistrées dans art/raw puis détourées.
function artUploader(): Plugin {
  const allowed = new Set<string>();
  for (const it of buildItems()) {
    allowed.add(it.file);
    for (const v of it.variants ?? []) allowed.add(v.file);
  }
  const send = (res: import('node:http').ServerResponse, code: number, body: unknown) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  return {
    name: 'hexaria-art-uploader',
    configureServer(server) {
      server.middlewares.use('/__art/ping', (_req, res) => send(res, 200, { ok: true }));
      server.middlewares.use('/__art/upload', (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST attendu' });
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('file') ?? '';
        if (!allowed.has(name)) return send(res, 400, { ok: false, error: `nom de fichier inconnu : ${name}` });
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (buf.length < 100) return send(res, 400, { ok: false, error: 'fichier vide' });
          mkdirSync('art/raw', { recursive: true });
          writeFileSync(join('art/raw', name), buf);
          execFile('node', ['scripts/art/process.mjs', name], { cwd: process.cwd() }, (err, stdout, stderr) => {
            if (err) return send(res, 500, { ok: false, error: stderr || err.message });
            send(res, 200, { ok: true, log: stdout });
          });
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [iconWriter(), artUploader()],
});
