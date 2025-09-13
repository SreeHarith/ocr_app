// dumpSrcFolder.js
const fs = require("fs");
const path = require("path");

const folder = path.join(__dirname, "src"); // dump from src/
const outputFile = path.join(__dirname, "src_dump.txt");

// allowed file extensions (add/remove as you like)
const allowedExts = [".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".json"];

// folders you want to skip
const excludeDirs = ["ui"];

function dumpFiles(dir, out) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (excludeDirs.includes(item)) continue; // skip excluded dirs
      dumpFiles(fullPath, out);
    } else {
      const ext = path.extname(item);
      if (!allowedExts.includes(ext)) continue; // skip unwanted files

      out.write(`\n\n=== FILE: ${fullPath.replace(__dirname, "")} ===\n\n`);
      out.write(fs.readFileSync(fullPath, "utf8"));
    }
  }
}

const out = fs.createWriteStream(outputFile);
dumpFiles(folder, out);
out.end();

console.log(`✅ Dumped all files from /src into ${outputFile}, excluding: ${excludeDirs.join(", ")}`);
