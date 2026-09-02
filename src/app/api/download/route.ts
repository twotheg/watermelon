import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

const EXCLUDED = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "out",
  ".env",
  ".env.local",
  ".DS_Store",
]);
const EXCLUDED_EXTENSIONS = new Set([".zip"]);

function addDirectory(zip: AdmZip, root: string, dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath);

    if (entry.isDirectory()) {
      addDirectory(zip, root, fullPath);
    } else {
      if (EXCLUDED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      zip.addLocalFile(fullPath, path.dirname(relativePath));
    }
  }
}

export const dynamic = "force-dynamic";

export async function GET() {
  const root = process.cwd();
  const zip = new AdmZip();
  addDirectory(zip, root, root);

  const buffer = zip.toBuffer();
  const bytes = new Uint8Array(buffer);

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="suika-merge-pwa.zip"`,
      "Content-Length": String(buffer.length),
    },
  });
}
