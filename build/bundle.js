require('esbuild').buildSync({
  entryPoints: ['src/index.js'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: Object.keys(require('../package.json').dependencies),
})
