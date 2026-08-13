import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

const EXCLUDE = new Set([
  '.git',
  '.github',
  '.agents',
  'archive',
  'node_modules'
]);

function getDirFilesHash(src, relBase = '', hasher = crypto.createHash('sha256')) {
  if (!fs.existsSync(src)) return hasher;

  const entries = fs.readdirSync(src, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (EXCLUDE.has(entry.name) || entry.name.startsWith('.')) continue;

    const srcPath = path.join(src, entry.name);
    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      getDirFilesHash(srcPath, relPath, hasher);
    } else {
      hasher.update(relPath);
      hasher.update(fs.readFileSync(srcPath));
    }
  }

  return hasher;
}

// Compute total hash for site + tools
const hasher = crypto.createHash('sha256');
getDirFilesHash(ROOT_DIR, '', hasher);
if (TOOLS_DIR && fs.existsSync(TOOLS_DIR) && TOOLS_DIR !== ROOT_DIR) {
  getDirFilesHash(TOOLS_DIR, 'tools', hasher);
}
const siteHash = hasher.digest('hex');

// Read existing manifest
const manifestPath = path.join(ARCHIVE_DIR, 'manifest.json');
let manifest = { snapshots: [] };

if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    manifest = { snapshots: [] };
  }
}

const latestSnapshot = manifest.snapshots[0];
const today = new Date().toISOString().split('T')[0];

if (latestSnapshot && latestSnapshot.hash === siteHash) {
  console.log(`No content changes detected (hash: ${siteHash.substring(0, 8)}, latest snapshot: ${latestSnapshot.date}).`);
  console.log('Skipping snapshot creation to avoid duplicate storage.');
  process.exit(0);
}

function copyDir(src, dest, relBase = '') {
  if (!fs.existsSync(src)) return [];
  fs.mkdirSync(dest, { recursive: true });
  
  let routes = [];
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (EXCLUDE.has(entry.name) || entry.name.startsWith('.')) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      routes = routes.concat(copyDir(srcPath, destPath, relPath));
    } else {
      fs.copyFileSync(srcPath, destPath);
      if (entry.name === 'index.html') {
        routes.push(relBase ? `/${relBase}/` : '/');
      } else if (entry.name.endsWith('.html')) {
        routes.push(`/${relPath}`);
      }
    }
  }

  return routes;
}

const targetSnapshotDir = path.join(SNAPSHOTS_DIR, today);
console.log(`Content changes detected. Creating snapshot for ${today}...`);

// Copy root site
let mainRoutes = copyDir(ROOT_DIR, targetSnapshotDir);

// Copy tools repo into snapshots/YYYY-MM-DD/tools if exists
let toolsRoutes = [];
if (TOOLS_DIR && fs.existsSync(TOOLS_DIR) && TOOLS_DIR !== targetSnapshotDir) {
  toolsRoutes = copyDir(TOOLS_DIR, path.join(targetSnapshotDir, 'tools'), 'tools');
}

const allRoutes = Array.from(new Set([...mainRoutes, ...toolsRoutes])).sort();

// Remove existing snapshot entry for today if re-running with new changes
manifest.snapshots = manifest.snapshots.filter(s => s.date !== today);

manifest.snapshots.unshift({
  date: today,
  timestamp: new Date().toISOString(),
  hash: siteHash,
  path: `snapshots/${today}`,
  routes: allRoutes
});

manifest.snapshots.sort((a, b) => b.date.localeCompare(a.date));

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Snapshot saved to archive/snapshots/${today} [hash: ${siteHash.substring(0, 8)}]`);
console.log(`Manifest updated with ${allRoutes.length} archived routes.`);
