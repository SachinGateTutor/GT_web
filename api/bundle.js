// Runtime bundle rewriter for Vercel serverless.
// Replaces hardcoded backend IPs in the compiled Expo web bundle using env vars.
const fs = require('fs');
const path = require('path');

// The compiled bundle we need to serve.
const BUNDLE_PATH = path.join(
  process.cwd(),
  '_expo',
  'static',
  'js',
  'web',
  'index-9b5fc6c3dc7a2cc43194b7a4abbc8a81.js'
);

// Default values baked into the bundle.
const DEFAULTS = {
  NET_BASE_URL: 'http://192.168.0.102:5125',
  PYTHON_BASE_URL: 'http://192.168.0.102:5000',
  AI_BASE_URL: 'http://192.168.0.102:5007',
  AI_ALT_BASE_URL: 'http://192.168.0.102:5001',
  CODE_BASE_URL: 'http://192.168.0.102:5081',
};

const REPLACEMENTS = [
  { from: DEFAULTS.NET_BASE_URL, env: 'NET_BASE_URL' },
  { from: DEFAULTS.PYTHON_BASE_URL, env: 'PYTHON_BASE_URL' },
  { from: DEFAULTS.AI_BASE_URL, env: 'AI_BASE_URL' },
  { from: DEFAULTS.AI_ALT_BASE_URL, env: 'AI_ALT_BASE_URL' },
  { from: DEFAULTS.CODE_BASE_URL, env: 'CODE_BASE_URL' },
];

let cachedOutput = null;

module.exports = async function handler(req, res) {
  try {
    if (!cachedOutput) {
      const original = await fs.promises.readFile(BUNDLE_PATH, 'utf8');
      let output = original;
      const applied = [];

      for (const { from, env } of REPLACEMENTS) {
        const to = process.env[env] || from;
        if (to === from) continue; // nothing to change
        const replaced = output.split(from).join(to);
        if (replaced !== output) {
          applied.push({ env, to });
          output = replaced;
        }
      }

      cachedOutput = output;
      console.log(
        '[bundle-rewrite] applied:',
        applied.length ? applied.map(a => `${a.env}=${a.to}`).join(', ') : 'none'
      );
    }

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=0, stale-while-revalidate=0');
    res.status(200).send(cachedOutput);
  } catch (err) {
    console.error('[bundle-rewrite] error:', err);
    res.status(500).send('Internal Server Error');
  }
};

