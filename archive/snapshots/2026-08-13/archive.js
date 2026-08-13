import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

// Find tools directory path (inner ./tools in CI vs local Windows path C:\Users\User\Documents\GitHub\tools vs relative ../tools)
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

const today = new Date().toISOString().split('T')[0];
const targetSnapshotDir = path.join(SNAPSHOTS_DIR, today);

console.log(`Creating snapshot for ${today}...`);

// Copy root site
let mainRoutes = copyDir(ROOT_DIR, targetSnapshotDir);

// Copy tools repo into snapshots/YYYY-MM-DD/tools if exists
let toolsRoutes = [];
if (TOOLS_DIR && fs.existsSync(TOOLS_DIR) && TOOLS_DIR !== targetSnapshotDir) {
  toolsRoutes = copyDir(TOOLS_DIR, path.join(targetSnapshotDir, 'tools'), 'tools');
}

const allRoutes = Array.from(new Set([...mainRoutes, ...toolsRoutes])).sort();

// Update manifest
const manifestPath = path.join(ARCHIVE_DIR, 'manifest.json');
let manifest = { snapshots: [] };

if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    manifest = { snapshots: [] };
  }
}

// Remove existing snapshot entry for today if re-running
manifest.snapshots = manifest.snapshots.filter(s => s.date !== today);

manifest.snapshots.push({
  date: today,
  timestamp: new Date().toISOString(),
  path: `snapshots/${today}`,
  routes: allRoutes
});

manifest.snapshots.sort((a, b) => b.date.localeCompare(a.date));

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Snapshot saved to archive/snapshots/${today}`);
console.log(`Manifest updated with ${allRoutes.length} archived routes.`);
