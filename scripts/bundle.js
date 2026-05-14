const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  // Bundle main.js with all dependencies
  const ctx = await esbuild.context({
    entryPoints: ['src/main.ts'],
    bundle: true,
    platform: 'browser',
    target: 'es2020',
    outfile: 'dist/bundle.js',
    format: 'cjs',
    sourcemap: true,
    minify: false,
    external: ['obsidian'],
    logLevel: 'info',
    loader: {
      '.ts': 'ts'
    }
  });

  await ctx.rebuild();
  await ctx.dispose();

  // Deploy to Obsidian vault
  const pluginDir = process.env.OBSIDIAN_PLUGIN_DIR || '/home/how/文档/Obsidian Vault/.obsidian/plugins/obsidian-memory';

  // Ensure plugin dir exists
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
  }

  // Copy bundle.js as main.js (this is the self-contained bundle)
  fs.copyFileSync('dist/bundle.js', path.join(pluginDir, 'main.js'));
  if (fs.existsSync('dist/bundle.js.map')) {
    fs.copyFileSync('dist/bundle.js.map', path.join(pluginDir, 'main.js.map'));
  }

  // Copy manifest and styles
  fs.copyFileSync('manifest.json', path.join(pluginDir, 'manifest.json'));
  fs.copyFileSync('styles.css', path.join(pluginDir, 'styles.css'));

  console.log('Bundle and deploy complete!');
  console.log('Main file:', path.join(pluginDir, 'main.js'), '(' + fs.statSync(path.join(pluginDir, 'main.js')).size + ' bytes)');
}

build().catch(e => {
  console.error(e);
  process.exit(1);
});