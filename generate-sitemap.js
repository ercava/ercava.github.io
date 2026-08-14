import fs from 'fs';
import path from 'path';

const DOMAIN = 'https://erc.my.id';
const ROOT_DIR = process.cwd();

// Directories/files to exclude from sitemap
const EXCLUDE = new Set([
  '.git',
  '.github',
  '.agents',
  'node_modules',
  '404.html',
  'robots.txt',
  'sitemap.xml',
  'CNAME',
  'README.md',
  'error.png',
  'favicon.ico',
  'logo.svg'
]);

function getRoutes(dir, currentRelPath = '') {
  let routes = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (EXCLUDE.has(entry.name) || entry.name.startsWith('.')) {
      continue;
    }

    // Exclude archive snapshots subfolder from sitemap
    if (currentRelPath === 'archive' && entry.name === 'snapshots') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = currentRelPath ? `${currentRelPath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const indexPath = path.join(fullPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        // Skip adding directory route if index.html is a redirect shell to another target (e.g. /tools/*)
        const htmlContent = fs.readFileSync(indexPath, 'utf-8');
        if (!htmlContent.includes('http-equiv="refresh"') && !htmlContent.includes('location.replace')) {
          routes.push(`/${relPath}/`);
        }
      }
      routes = routes.concat(getRoutes(fullPath, relPath));
    } else if (entry.name === 'index.html') {
      if (currentRelPath === '') {
        routes.push('/');
      } else {
        const htmlContent = fs.readFileSync(fullPath, 'utf-8');
        if (!htmlContent.includes('http-equiv="refresh"') && !htmlContent.includes('location.replace')) {
          routes.push(`/${currentRelPath}/`);
        }
      }
    } else if (entry.name.endsWith('.html') && entry.name !== 'index.html') {
      routes.push(`/${relPath}`);
    }
  }

  return routes;
}

// Multi-platform tools repo path resolution
const INNER_TOOLS_DIR = path.resolve(ROOT_DIR, 'tools');
const LOCAL_TOOLS_DIR = 'C:\\Users\\User\\Documents\\GitHub\\tools';
const REL_TOOLS_DIR = path.resolve(ROOT_DIR, '../tools');

let toolsPath = null;
if (fs.existsSync(INNER_TOOLS_DIR)) {
  toolsPath = INNER_TOOLS_DIR;
} else if (fs.existsSync(LOCAL_TOOLS_DIR)) {
  toolsPath = LOCAL_TOOLS_DIR;
} else if (fs.existsSync(REL_TOOLS_DIR)) {
  toolsPath = REL_TOOLS_DIR;
}

let routes = getRoutes(ROOT_DIR);

if (toolsPath && fs.existsSync(toolsPath) && toolsPath !== ROOT_DIR) {
  const extraRoutes = getRoutes(toolsPath, 'tools');
  routes = routes.concat(extraRoutes);
}

routes = Array.from(new Set(routes)).sort((a, b) => {
  if (a === '/') return -1;
  if (b === '/') return 1;
  return a.localeCompare(b);
});

const today = new Date().toISOString().split('T')[0];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((route) => {
    const priority = route === '/' ? '1.0' : '0.8';
    return `  <url>
    <loc>${DOMAIN}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), xml);
console.log(`Generated sitemap.xml with ${routes.length} URLs.`);
