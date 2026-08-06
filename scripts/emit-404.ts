/**
 * GitHub Pages serves 404.html for any unknown path. The spa-github-pages trick
 * turns that miss into a redirect back to index.html carrying the original path,
 * which index.html's inline script unpacks before React Router boots.
 *
 * pathSegmentsToKeep = 1 keeps the /Enterprise-Architecture/ project-page prefix.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const base = process.env.BASE_PATH ?? '/Enterprise-Architecture/'
const segments = base.split('/').filter(Boolean).length

if (!existsSync(dist)) {
  console.error('emit-404: dist/ not found — run vite build first')
  process.exit(1)
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Archipelago</title>
    <script>
      // Single-page-app redirect for GitHub Pages — see index.html for the other half.
      (function (l) {
        var pathSegmentsToKeep = ${segments};
        l.replace(
          l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
          l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
          l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
          (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
          l.hash
        );
      })(window.location)
    </script>
  </head>
  <body></body>
</html>
`

writeFileSync(join(dist, '404.html'), html)

// .nojekyll stops GitHub Pages from dropping Vite's _-prefixed asset directories.
writeFileSync(join(dist, '.nojekyll'), '')

const index = join(dist, 'index.html')
if (!readFileSync(index, 'utf8').includes('id="root"')) {
  console.error('emit-404: dist/index.html looks wrong')
  process.exit(1)
}

console.log(`emit-404: wrote dist/404.html (pathSegmentsToKeep=${segments}) and dist/.nojekyll`)
