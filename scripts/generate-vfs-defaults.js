const fs = require('fs/promises');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const defaultsDir = path.join(workspaceRoot, 'lib', 'vfs-defaults');
const manifestPath = path.join(defaultsDir, 'manifest.json');

const textTypes = new Set(['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.css', '.html', '.htm', '.svg']);

async function walk(dir, base = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(base, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(await walk(fullPath, relPath));
      continue;
    }

    files.push(relPath);
  }

  return files;
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (textTypes.has(ext)) return 'text/plain';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

(async () => {
  const allEntries = await walk(defaultsDir);

  const folders = new Set();
  const files = [];

  for (const entry of allEntries) {
    const normalized = normalizePath(entry);
    const baseName = normalized.split('/').pop();

    if (baseName === '.gitkeep' || normalized === 'manifest.json' || normalized === 'index.ts') {
      const dir = normalized.includes('/') ? normalized.substring(0, normalized.lastIndexOf('/')) : '';
      if (dir) {
        const parts = dir.split('/');
        let current = 'C:';
        for (const segment of parts) {
          current += `/${segment}`;
          folders.add(current);
        }
      }
      continue;
    }

    const parts = normalized.split('/');
    const parentParts = parts.slice(0, -1);
    let current = 'C:';
    for (const segment of parentParts) {
      current += `/${segment}`;
      folders.add(current);
    }

    const filePath = path.join(defaultsDir, normalized);
    const buffer = await fs.readFile(filePath);
    const contentBase64 = buffer.toString('base64');
    const contentType = getMimeType(normalized);

    files.push({
      relativePath: normalized,
      name: parts[parts.length - 1],
      contentBase64,
      contentType,
    });
  }

  const manifest = {
    folders: Array.from(folders).sort(),
    files,
    mounts: [{ letter: 'C', handle: null, label: 'AmerOS Boot' }],
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Generated VFS defaults manifest with ${files.length} files and ${folders.size} folders.`);
})();
