import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

const ROOT_DIR = process.cwd();

// Find tools directory path
const INNER_TOOLS_DIR = path.resolve(ROOT_DIR, 'tools');
const LOCAL_TOOLS_DIR = 'C:\\Users\\User\\Documents\\GitHub\\tools';
const REL_TOOLS_DIR = path.resolve(ROOT_DIR, '../tools');

let TOOLS_DIR = null;
if (fs.existsSync(INNER_TOOLS_DIR)) {
  TOOLS_DIR = INNER_TOOLS_DIR;
} else if (fs.existsSync(LOCAL_TOOLS_DIR)) {
  TOOLS_DIR = LOCAL_TOOLS_DIR;
} else if (fs.existsSync(REL_TOOLS_DIR)) {
  TOOLS_DIR = REL_TOOLS_DIR;
}

const ARCHIVE_DIR = path.join(ROOT_DIR, 'archive');
const SNAPSHOTS_DIR = path.join(ARCHIVE_DIR, 'snapshots');
const MANIFEST_FILE = path.join(ARCHIVE_DIR, 'manifest.json');

const EXCLUDE = new Set([
  '.git',
  '.github',
  '.agents',
  'archive',
  'node_modules'
]);

function collectPages(src, relBase = '') {
  if (!fs.existsSync(src)) return {};

  let pages = {};
  const entries = fs.readdirSync(src, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (EXCLUDE.has(entry.name) || entry.name.startsWith('.')) continue;

    const srcPath = path.join(src, entry.name);
    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      Object.assign(pages, collectPages(srcPath, relPath));
    } else if (entry.name === 'index.html') {
      const route = relBase ? `/${relBase}/` : '/';
      pages[route] = fs.readFileSync(srcPath, 'utf-8');
    } else if (entry.name.endsWith('.html')) {
      pages[`/${relPath}`] = fs.readFileSync(srcPath, 'utf-8');
    }
  }

  return pages;
}

console.log('Collecting page contents...');

// Collect HTML pages from main site & tools
const mainPages = collectPages(ROOT_DIR);
let toolsPages = {};
if (TOOLS_DIR && fs.existsSync(TOOLS_DIR) && TOOLS_DIR !== ROOT_DIR) {
  toolsPages = collectPages(TOOLS_DIR, 'tools');
}

const allPages = { ...mainPages, ...toolsPages };

// Compute SHA-256 content hash
const hasher = crypto.createHash('sha256');
const sortedRoutes = Object.keys(allPages).sort();
for (const route of sortedRoutes) {
  hasher.update(route);
  hasher.update(allPages[route]);
}
const siteHash = hasher.digest('hex');

// Read existing manifest
let manifest = { snapshots: [] };
if (fs.existsSync(MANIFEST_FILE)) {
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
  } catch (e) {
    manifest = { snapshots: [] };
  }
}

const today = new Date().toISOString().split('T')[0];
const latestSnapshot = manifest.snapshots[0];

if (latestSnapshot && latestSnapshot.hash === siteHash) {
  console.log(`No content changes detected (hash: ${siteHash.substring(0, 8)}, latest: ${latestSnapshot.date}).`);
  console.log('Skipping snapshot creation.');
  process.exit(0);
}

fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

// Create single compressed JSON file per snapshot date
const snapshotData = {
  date: today,
  timestamp: new Date().toISOString(),
  hash: siteHash,
  pages: allPages
};

const jsonStr = JSON.stringify(snapshotData);
const compressed = zlib.gzipSync(Buffer.from(jsonStr));

const snapshotFileName = `${today}.json.gz`;
const snapshotFilePath = path.join(SNAPSHOTS_DIR, snapshotFileName);
fs.writeFileSync(snapshotFilePath, compressed);

// Update manifest
manifest.snapshots = manifest.snapshots.filter(s => s.date !== today);
manifest.snapshots.unshift({
  date: today,
  timestamp: new Date().toISOString(),
  hash: siteHash,
  file: `snapshots/${snapshotFileName}`,
  routes: sortedRoutes
});

manifest.snapshots.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

// Clean up legacy snapshots.json if present
const legacySingleFile = path.join(ARCHIVE_DIR, 'snapshots.json');
if (fs.existsSync(legacySingleFile)) {
  fs.rmSync(legacySingleFile, { force: true });
}

console.log(`Saved compressed snapshot: archive/snapshots/${snapshotFileName} (${(compressed.length / 1024).toFixed(1)} KB) [hash: ${siteHash.substring(0, 8)}]`);
console.log(`Manifest updated with ${sortedRoutes.length} archived routes.`);
