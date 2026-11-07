// Makes github-upload/EducAlvator/: a clean copy of exactly the files git tracks
// (nothing from .gitignore: no node_modules, dist, data, .env or key files),
// with LF line endings, ready to drag into GitHub's web uploader. That uploader
// ignores .gitignore and .gitattributes and takes at most 100 files at a time,
// so this also checks the count and scans the copy for API keys.
//
//   npm run export:github
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outParent = join(root, "github-upload");
const out = join(outParent, "EducAlvator");
const LIMIT = 100;
const KEY_PATTERN = /AIza[0-9A-Za-z_-]{30,}|AQ\.[A-Za-z0-9_-]{30,}|nvapi-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY/;

const git = (args, env) =>
  execFileSync("git", ["-c", "core.safecrlf=false", ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    maxBuffer: 1 << 30,
    stdio: ["ignore", "pipe", "ignore"],
  });

// Snapshot the working tree (tracked + new files, minus ignored ones) without
// touching the real index or making a commit.
const index = join(tmpdir(), `educalvator-export-${process.pid}.index`);
let tree;
try {
  git(["read-tree", "HEAD"], { GIT_INDEX_FILE: index });
  git(["add", "-A"], { GIT_INDEX_FILE: index });
  tree = git(["write-tree"], { GIT_INDEX_FILE: index }).toString().trim();
} finally {
  rmSync(index, { force: true });
}

// Unpack from stdin, run inside the folder, so no Windows path reaches tar.
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
execFileSync("tar", ["-xf", "-"], { cwd: out, input: git(["archive", "--format=tar", tree]), maxBuffer: 1 << 30 });

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(out);

const leaks = files.filter((f) => KEY_PATTERN.test(readFileSync(f, "latin1")));
if (leaks.length) {
  rmSync(out, { recursive: true, force: true });
  console.error("Stopped: these files look like they contain an API key or private key:");
  leaks.forEach((f) => console.error("  " + relative(out, f)));
  process.exit(1);
}

const rel = relative(root, out);
console.log(`Exported ${files.length} files to ${rel}${existsSync(out) ? "" : " (missing!)"}`);
if (files.length >= LIMIT) {
  console.warn(`Warning: GitHub's web uploader takes fewer than ${LIMIT} files per upload; upload this in parts.`);
  process.exitCode = 2;
} else {
  console.log(`Under GitHub's ${LIMIT}-file web upload limit. No API keys found.`);
  console.log(`Drag everything inside ${rel} (including the dot-files) onto "Add file > Upload files".`);
}
