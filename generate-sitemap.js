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

    const fullPath = path.join(dir, entry.name);
    const relPath = currentRelPath ? `${currentRelPath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const indexPath = path.join(fullPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        routes.push(`/${relPath}/`);
      }
      routes = routes.concat(getRoutes(fullPath, relPath));
    } else if (entry.name === 'index.html' && currentRelPath === '') {
      routes.push('/');
    } else if (entry.name.endsWith('.html') && entry.name !== 'index.html') {
      routes.push(`/${relPath}`);
    }
  }

  return routes;
}

// Additional external repo paths mapped to subpaths
const EXTERNAL_REPOS = [
  { path: 'C:\\Users\\User\\Documents\\GitHub\\ercademy', baseRoute: 'ercademy' },
  { path: 'C:\\Users\\User\\Documents\\GitHub\\tools', baseRoute: 'tools' }
];

let routes = getRoutes(ROOT_DIR);

for (const extra of EXTERNAL_REPOS) {
  if (fs.existsSync(extra.path)) {
    const extraRoutes = getRoutes(extra.path, extra.baseRoute);
    routes = routes.concat(extraRoutes);
  }
}

routes = Array.from(new Set(routes));

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
