import sharp from "sharp";
import fs from "node:fs";

const input = "public/sao tm.svg";
const outputDir = "public/icons";

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

await sharp(input)
  .resize(192, 192, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  })
  .png()
  .toFile(`${outputDir}/icon-192.png`);

await sharp(input)
  .resize(512, 512, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  })
  .png()
  .toFile(`${outputDir}/icon-512.png`);

console.log("✅ SAO PWA icons generated successfully.");