#!/usr/bin/env node
// Starts Expo together with a small log server that receives errors from the app
// (see devLogger.js), prints them in this terminal and saves them to logs/device.log.
// Usage: npm run dev            (extra args go to expo, e.g. npm run dev -- -c)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.DEVICE_LOG_PORT) || 8099;
const LOG_FILE = path.join(__dirname, '..', 'logs', 'device.log');

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

const colors = { error: '\x1b[31m', fatal: '\x1b[41m\x1b[37m', warn: '\x1b[33m' };
const reset = '\x1b[0m';

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/log') {
    res.writeHead(404).end();
    return;
  }
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 100000) req.destroy();
  });
  req.on('end', () => {
    res.writeHead(204).end();
    let entry;
    try {
      entry = JSON.parse(body);
    } catch {
      return;
    }
    const level = String(entry.level || 'error');
    const time = new Date(entry.time || Date.now()).toLocaleTimeString();
    const header = `[device ${level.toUpperCase()}] ${time} (${entry.platform || '?'})`;
    const text = [entry.message, entry.stack].filter(Boolean).join('\n');

    console.log(`${colors[level] || ''}${header}${reset} ${text}`);
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${header}\n${text}\n\n`);
  });
});

server.on('error', (err) => {
  console.error(`Device log server could not start on port ${PORT}: ${err.message}`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Device errors will appear here and in logs/device.log (port ${PORT}).\n`);
  const expo = spawn('npx', ['expo', 'start', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_DEVICE_LOG_PORT: String(PORT) },
  });
  expo.on('exit', (code) => {
    server.close();
    process.exit(code ?? 0);
  });
});
