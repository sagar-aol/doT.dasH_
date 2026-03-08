/**
 * REUSABLE VERSION BUMPER
 * Run this via terminal: node bump-version.js
 */

const fs = require("fs");
const path = require("path");

// 1. Point to your HTML file
const filePath = path.join(__dirname, "index.html");

// 2. Read the file
let html;
try {
  html = fs.readFileSync(filePath, "utf8");
} catch (err) {
  console.error("❌ Could not find index.html!");
  process.exit(1);
}

// 3. The Regex to find your exact span
const versionRegex = /<span class="version-info">ver (\d+)\.(\d+)\.(\d+)<\/span>/;

if (!versionRegex.test(html)) {
  console.error('❌ Could not find <span class="version-info">ver X.Y.Z</span> in your HTML.');
  process.exit(1);
}

// 4. Do the math and replace
const updatedHtml = html.replace(versionRegex, (match, major, minor, patch) => {
  let maj = parseInt(major);
  let min = parseInt(minor);
  let pat = parseInt(patch);

  // Increment patch
  pat++;

  // User Rule: After .9, roll over to the next minor version
  if (pat > 9) {
    pat = 0;
    min++;
  }

  // Standard Rule: After .9 minor, roll over to the next major version
  if (min > 9) {
    min = 0;
    maj++;
  }

  const newVersion = `ver ${maj}.${min}.${pat}`;
  console.log(`🚀 Version bumped: ${match.replace(/<[^>]*>/g, "")} ➡️  ${newVersion}`);

  return `<span class="version-info">${newVersion}</span>`;
});

// 5. Write the changes back to the file
fs.writeFileSync(filePath, updatedHtml, "utf8");
console.log("✅ index.html updated successfully!");
