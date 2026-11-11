// Render SkyscraperShort to out/skyscraper/video.mp4 using Remotion + ANGLE GPU acceleration
import fs from "node:fs";
import path from "node:path";
if (process.env.REMOTION_TMP) {
  fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true });
  process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP;
}
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const outFile = process.argv[2] || "out/skyscraper/video.mp4";
const scale = Number(process.argv[3] || "1");
const concurrency = Number(process.argv[4] || "2");
const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };

console.log(`Bundling SkyscraperShort (scale=${scale}, concurrency=${concurrency})...`);
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  publicDir: path.resolve("public"),
});

const composition = await selectComposition({
  serveUrl,
  id: "SkyscraperShort",
  browserExecutable,
  chromiumOptions,
});

console.log(`Rendering ${composition.durationInFrames} frames at ${composition.fps} fps...`);
const t0 = Date.now();
let lastPct = -1;

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: path.resolve(outFile),
  scale,
  concurrency,
  browserExecutable,
  chromiumOptions,
  jpegQuality: 90,
  crf: 18,
  timeoutInMilliseconds: 180000,
  onProgress: ({ renderedFrames, encodedFrames }) => {
    const pct = Math.floor((renderedFrames / composition.durationInFrames) * 20) * 5;
    if (pct > lastPct) {
      lastPct = pct;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[${elapsed}s] rendered ${renderedFrames}/${composition.durationInFrames} (${pct}%), encoded ${encodedFrames}`);
    }
  },
});

console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outFile}`);

