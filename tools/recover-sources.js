// tools/recover-sources.js
import fs from "node:fs";
import path from "node:path";

const SRCMAP_RE =
  /(?:\/\/[#@]\s*sourceMappingURL=([^\s]+)|\/\*[#@]\s*sourceMappingURL=([^*]+)\*\/)/m;

function findMapRef(code) {
  const m = code.match(SRCMAP_RE);
  return m ? (m[1] || m[2]).trim() : null;
}

function parseDataUrl(u) {
  const m = u.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;(base64|text)?,(.*)$/);
  if (!m) return null;
  const [, , enc, payload] = m;
  const buf =
    enc === "base64" ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
  return JSON.parse(buf.toString("utf8"));
}

function materializeMap(jsPath, outDir) {
  const code = fs.readFileSync(jsPath, "utf8");
  const ref = findMapRef(code);
  if (!ref) return null;

  let map, mapPath;
  if (ref.startsWith("data:")) {
    map = parseDataUrl(ref);
    mapPath = jsPath + ".map";
    fs.writeFileSync(mapPath, JSON.stringify(map));
  } else {
    mapPath = path.resolve(path.dirname(jsPath), ref);
    if (!fs.existsSync(mapPath)) return null;
    map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  }

  // Write out sources to disk
  const base = path.join(outDir, path.relative(process.cwd(), path.dirname(jsPath)));
  for (let i = 0; i < map.sources.length; i++) {
    const src = map.sources[i];
    const content =
      map.sourcesContent && map.sourcesContent[i] != null
        ? map.sourcesContent[i]
        : null;

    // Normalize weird webpack/vite virtual paths
    const safeRel = src
      .replace(/^webpack:\/\//, "")
      .replace(/^vite\//, "")
      .replace(/^\.\//, "")
      .replace(/\?/g, "_");

    const outPath = path.join(outDir, safeRel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    if (content != null) {
      fs.writeFileSync(outPath, content);
    } else {
      // Last-ditch: try resolving relative to jsPath
      const tryFile = path.resolve(path.dirname(jsPath), src);
      if (fs.existsSync(tryFile)) {
        fs.copyFileSync(tryFile, outPath);
      } else {
        fs.writeFileSync(outPath + ".MISSING", `No sourcesContent and not found on disk: ${src}\n`);
      }
    }
  }
  return mapPath;
}

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, cb);
    else cb(p);
  }
}

const root = process.argv[2] || "extension";
const outDir = process.argv[3] || "recovered";
fs.mkdirSync(outDir, { recursive: true });

walk(root, (p) => {
  if (/\.(m?js)$/.test(p)) {
    try {
      materializeMap(p, outDir);
    } catch (e) {
      console.warn("map fail:", p, e.message);
    }
  }
});

console.log("Done. Sources under:", outDir);
