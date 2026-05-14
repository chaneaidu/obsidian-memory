const fs = require('fs');
const path = require('path');

const manifest = require('./manifest.json');
const version = manifest.version;

console.log(`Building obsidian-memory v${version}...`);

// Copy manifest to dist if it exists
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  fs.copyFileSync(
    path.join(__dirname, '..', 'manifest.json'),
    path.join(distDir, 'manifest.json')
  );
  fs.copyFileSync(
    path.join(__dirname, '..', 'styles.css'),
    path.join(distDir, 'styles.css')
  );
}

console.log('Build complete!');