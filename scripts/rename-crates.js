#!/usr/bin/env node
// One-shot: rename published packages, keep the code compiling via [lib] name = <old ident>.
// Re-run after a `git subtree pull` if upstream ever touches a [package] name.
// Versions are owned by release-plz in each Cargo.toml, not by this script.
// Usage: node rename-crates.js [cratesDir] [--write]
const fs = require("fs"),
  path = require("path");

const MAP = {
  "cosmic-dbus-a11y": "corona-zbus-a11y",
  "accounts-zbus": "corona-zbus-accounts",
  "bluez-zbus": "corona-zbus-bluez",
  "cosmic-settings-daemon": "cosmic-settings-daemon", // not published, see release-plz.toml
  geoclue2: "corona-zbus-geoclue2",
  "hostname1-zbus": "corona-zbus-hostname1",
  locale1: "corona-zbus-locale1",
  "mpris2-zbus": "corona-zbus-mpris2",
  "cosmic-dbus-networkmanager": "corona-zbus-networkmanager",
  "nm-secret-agent-manager": "corona-zbus-nm-secret-agent-manager",
  "switcheroo-control": "corona-zbus-switcheroo-control",
  "timedate-zbus": "corona-zbus-timedate",
  upower_dbus: "corona-zbus-upower",
};

// crates upstream added that nobody has mapped yet: named so they are obvious
// on sight, and so the auto-merge guard can refuse the PR
const UNMAPPED_PREFIX = "corona-zbus-unmapped-";

const root = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "crates";
const write = process.argv.includes("--write");
const unmapped = [];

for (const e of fs.readdirSync(root, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const file = path.join(root, e.name, "Cargo.toml");
  if (!fs.existsSync(file)) continue;

  const src = fs.readFileSync(file, "utf8");
  const m = src.match(/^name\s*=\s*"([^"]+)"/m);
  if (!m) continue;

  const oldName = m[1],
    libName = oldName.replace(/-/g, "_");

  // already renamed by an earlier run
  if (oldName.startsWith(UNMAPPED_PREFIX)) {
    unmapped.push(`${e.name} (${oldName})`);
    continue;
  }
  if (Object.values(MAP).includes(oldName)) continue;

  const newName = MAP[oldName] ?? UNMAPPED_PREFIX + e.name;
  if (!MAP[oldName]) {
    unmapped.push(`${e.name} (${oldName})`);
    console.log(`  !! no mapping for "${oldName}", using placeholder`);
  }

  let out = src.replace(m[0], `name = "${newName}"`);

  if (!/^\[lib\]/m.test(out))
    out = out.replace(/^\[dependencies\]/m, `[lib]\nname = "${libName}"\n\n[dependencies]`);

  console.log(
    `${write ? "wrote" : "would write"} ${file}: ${oldName} -> ${newName} (lib ${libName})`,
  );
  if (write) fs.writeFileSync(file, out);
}
console.log(write ? "done" : "dry run; pass --write to apply");

// not an error: the PR still opens, the auto-merge guard refuses to merge it
if (unmapped.length) {
  console.warn(`\n${unmapped.length} unmapped crate(s): ${unmapped.join(", ")}`);
  console.warn("add them to MAP in scripts/rename-crates.js before releasing");
}
