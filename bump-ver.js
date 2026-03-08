/**
 * VERSION BUMPER
 * Run this via terminal: node bump-ver.js
 */

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "index.html");

let html;
try {
  html = fs.readFileSync(filePath, "utf8");
} catch (err) {
  console.error("❌ Could not find index.html!");
  process.exit(1);
}

const versionRegex = /<span class="version-info">ver (\d+)\.(\d+)\.(\d+)<\/span>/;

if (!versionRegex.test(html)) {
  console.error('❌ Could not find <span class="version-info">ver X.Y.Z</span> in your HTML.');
  process.exit(1);
}

const updatedHtml = html.replace(versionRegex, (match, major, minor, patch) => {
  let maj = parseInt(major);
  let min = parseInt(minor);
  let pat = parseInt(patch);

  pat++;

  if (pat > 9) { pat = 0; min++; }
  if (min > 9) { min = 0; maj++; }

  const newVersion = `ver ${maj}.${min}.${pat}`;
  console.log(`🚀 Patch Update: ${match.replace(/<[^>]*>/g, "")} ➡️  ${newVersion}`);

  return `<span class="version-info">${newVersion}</span>`;
});

fs.writeFileSync(filePath, updatedHtml, "utf8");
console.log("✅ index.html updated successfully!");