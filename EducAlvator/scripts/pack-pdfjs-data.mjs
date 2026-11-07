// Packs a folder of PDF.js data files (cmaps/ or standard_fonts/ from the PDF.js
// dist) into one .bin file, so the EduPanel extension ships 2 files instead of
// ~185. sidepanel.js reads them back (see PackedDataFactory there).
//
//   node scripts/pack-pdfjs-data.mjs <folder> <out.bin>
//
// Format: "PDFJSPK1", a uint32 (little-endian) header length, a JSON header
// { "<file name>": [offset, length], ... }, then the files' bytes back to back.
// Offsets count from the start of the data section. LICENSE files are skipped;
// keep them next to the pack as text.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dir, out] = process.argv.slice(2);
if (!dir || !out) {
  console.error("usage: node scripts/pack-pdfjs-data.mjs <folder> <out.bin>");
  process.exit(1);
}

const names = readdirSync(dir)
  .filter((n) => !n.startsWith("LICENSE") && statSync(join(dir, n)).isFile())
  .sort();
const header = {};
const chunks = [];
let offset = 0;
for (const name of names) {
  const data = readFileSync(join(dir, name));
  header[name] = [offset, data.length];
  chunks.push(data);
  offset += data.length;
}
const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
const len = Buffer.alloc(4);
len.writeUInt32LE(headerBytes.length);
writeFileSync(out, Buffer.concat([Buffer.from("PDFJSPK1", "ascii"), len, headerBytes, ...chunks]));
console.log(`packed ${names.length} files (${offset} bytes) into ${out}`);
