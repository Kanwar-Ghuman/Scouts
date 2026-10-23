// MapLibre resolves its worker next to its own bundle, which bundlers don't emit.
// Serve the version-matched worker from public/ instead (see setWorkerUrl in components/map/HexMap.tsx).
import fs from "node:fs";
import path from "node:path";

const src = path.join(process.cwd(), "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
const dest = path.join(process.cwd(), "public", "maplibre-gl-worker.mjs");
fs.copyFileSync(src, dest);
console.log("copied maplibre worker to public/");
