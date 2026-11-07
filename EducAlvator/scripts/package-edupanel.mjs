// Packages the EduPanel Chrome extension (ask-gemini-extension/) into
// public/downloads/EduPanel.zip for the "Get EduPanel" button. The API key file
// is never packaged: the zip is public, so a key inside it could be taken by
// anyone. An empty key file is added in its place for the student to fill in.
//
// Runs before `npm run dev` and `npm run build`; uses only Node built-ins.
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync, crc32 } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "ask-gemini-extension");
const out = join(root, "public", "downloads", "EduPanel.zip");
const KEY_FILE = "sidepannel.env.txt";
const BACKUP_KEY_FILES = ["sidepannel-backup.env.txt", "sidepannel-backup-2.env.txt"];
const SKIP = (name) => /\.env(\.txt)?$/i.test(name) || /^\.env/i.test(name) || name === ".DS_Store" || name === "Thumbs.db";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// Minimal ZIP writer (deflate, no zip64): enough for a small extension folder.
function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(0, 10); // time/date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, packed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + packed.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

const entries = walk(src).map((path) => ({
  name: "EduPanel/" + relative(src, path).split("\\").join("/"),
  data: readFileSync(path),
}));
entries.push({ name: `EduPanel/${KEY_FILE}`, data: Buffer.alloc(0) });
for (const file of BACKUP_KEY_FILES) entries.push({ name: `EduPanel/${file}`, data: Buffer.alloc(0) });

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, zip(entries));
console.log(`[edupanel] packaged ${entries.length} files into public/downloads/EduPanel.zip (no API key included)`);
