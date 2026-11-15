// Turns the output of `expo export -p web` into something a phone can install to its home screen and open offline.
// Usage: node scripts/make-pwa.mjs <dist folder>      (LIFTBOOK_BASE_URL must match the value used for the export)
// It adds the install tags to index.html, writes the offline worker with the list of this build's files,
// and copies index.html to 404.html so a host without rewrite rules still opens the app on any path.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = process.argv[2];
if (!dist || !existsSync(join(dist, 'index.html'))) {
  console.error('make-pwa: pass the folder that holds the exported index.html');
  process.exit(1);
}
const base = (process.env.LIFTBOOK_BASE_URL || '').replace(/\/+$/, '');
const here = dirname(fileURLToPath(import.meta.url));

for (const needed of ['manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png']) {
  if (!existsSync(join(dist, needed))) {
    console.error(`make-pwa: ${needed} is missing from the build. It should be copied from public/.`);
    process.exit(1);
  }
}

// 1. Install tags and the worker registration in index.html.
const htmlPath = join(dist, 'index.html');
let html = readFileSync(htmlPath, 'utf8');
if (html.includes('rel="manifest"')) {
  console.error('make-pwa: this build was already processed. Export again first.');
  process.exit(1);
}
const viewport = /<meta name="viewport"[^>]*>/;
if (!viewport.test(html) || !html.includes('</head>')) {
  console.error('make-pwa: index.html does not look like an Expo web export any more. Update this script.');
  process.exit(1);
}
// viewport-fit=cover lets the app draw under the notch and home bar, where it already leaves safe-area padding.
html = html.replace(viewport, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no" />');
const head = `
    <link rel="manifest" href="${base}/manifest.webmanifest" />
    <meta name="theme-color" content="#0D1010" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Liftbook" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png" />
    <style>html,body{background:#0A0C0B;overscroll-behavior:none;-webkit-text-size-adjust:100%;touch-action:manipulation}</style>
    <script>
      if ('serviceWorker' in navigator) {
        addEventListener('load', function () {
          navigator.serviceWorker.register('${base}/sw.js', { scope: '${base}/', updateViaCache: 'none' })
            .then(function (r) { r.update().catch(function () {}); }).catch(function () {});
        });
        // When a newer version has just taken over, reload once so the screen shows it. Logged data is kept.
        var hadController = !!navigator.serviceWorker.controller, reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (!hadController || reloaded) return;
          reloaded = true; location.reload();
        });
      }
      // Asks the browser not to clear this site's storage when the phone runs low on space.
      if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(function () {}); }
    </script>
  </head>`;
html = html.replace('</head>', head);
writeFileSync(htmlPath, html);
copyFileSync(htmlPath, join(dist, '404.html'));
// Stops GitHub Pages from skipping folders that start with an underscore, such as _expo.
writeFileSync(join(dist, '.nojekyll'), '');

// 2. The offline worker, with every file of this build listed and a version taken from their contents.
const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const skip = new Set(['sw.js', '404.html', '.nojekyll', 'metadata.json']);
const files = walk(dist).map((p) => relative(dist, p).split(sep).join('/')).filter((f) => !skip.has(f)).sort();
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(readFileSync(join(dist, f)));
const version = hash.digest('hex').slice(0, 12);
const sw = readFileSync(join(here, 'sw-template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__BASE__', base)
  .replace('__FILES__', JSON.stringify(files.map((f) => encodeURI(f))));
writeFileSync(join(dist, 'sw.js'), sw);

const bytes = files.reduce((n, f) => n + statSync(join(dist, f)).size, 0);
console.log(`make-pwa: ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB, version ${version}, base "${base || '/'}"`);
