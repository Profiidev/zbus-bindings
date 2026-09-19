#!/usr/bin/env node
// Change published package names only; code keeps compiling via [lib] name = <old ident>.
// Usage: node rename-crates.js [cratesDir] [--write]
const fs = require("fs"),
  path = require("path");

const MAP = {
  "cosmic-dbus-a11y": "corona-zbus-a11y",
  "accounts-zbus": "corona-zbus-accounts",
  "bluez-zbus": "corona-zbus-bluez",
  "cosmic-settings-daemon": "cosmic-settings-daemon",
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

const root = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "crates";
const write = process.argv.includes("--write");

for (const e of fs.readdirSync(root, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const file = path.join(root, e.name, "Cargo.toml");
  if (!fs.existsSync(file)) continue;

  const src = fs.readFileSync(file, "utf8");
  const m = src.match(/^name\s*=\s*"([^"]+)"/m);
  if (!m || !MAP[m[1]]) continue;

  const oldName = m[1],
    libName = oldName.replace(/-/g, "_");
  let out = src.replace(m[0], `name = "${MAP[oldName]}"`);
  if (!/^\[lib\]/m.test(out))
    out = out.replace(/^\[dependencies\]/m, `[lib]\nname = "${libName}"\n\n[dependencies]`);

  console.log(
    `${write ? "wrote" : "would write"} ${file}: ${oldName} -> ${MAP[oldName]} (lib ${libName})`,
  );
  if (write) fs.writeFileSync(file, out);
}
console.log(write ? "done" : "dry run; pass --write to apply");
