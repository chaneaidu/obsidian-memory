const fs = require('fs');
const path = require('path');

// Configure deployment path here or via environment variable
const pluginDir = process.env.OBSIDIAN_PLUGIN_DIR || '/home/how/文档/Obsidian Vault/.obsidian/plugins/obsidian-memory';

console.log('Deploying to Obsidian vault...');
console.log('Plugin dir:', pluginDir);

// Ensure plugin dir exists
if (!fs.existsSync(pluginDir)) {
  fs.mkdirSync(pluginDir, { recursive: true });
}

// Copy bundle.js as main.js
fs.copyFileSync('dist/bundle.js', path.join(pluginDir, 'main.js'));
console.log('  Copied: main.js (' + fs.statSync('dist/bundle.js').size + ' bytes)');

if (fs.existsSync('dist/bundle.js.map')) {
  fs.copyFileSync('dist/bundle.js.map', path.join(pluginDir, 'main.js.map'));
  console.log('  Copied: main.js.map');
}

// Copy manifest and styles
fs.copyFileSync('manifest.json', path.join(pluginDir, 'manifest.json'));
console.log('  Copied: manifest.json');

fs.copyFileSync('styles.css', path.join(pluginDir, 'styles.css'));
console.log('  Copied: styles.css');

console.log('Deploy complete!');