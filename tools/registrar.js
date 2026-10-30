// Anota un juego en la biblioteca de inigames.
// Uso: node tools/registrar.js <biblioteca.json> <id> "<titulo o vacío>" <ps2|psp>
const fs = require("fs");
const [p, id, titulo, plataforma] = process.argv.slice(2);
let a = [];
try { a = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
const t = titulo || id.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const i = a.findIndex((x) => x.id === id);
const entrada = { id, titulo: t, plataforma: plataforma || "ps2" };
if (i >= 0) a[i] = entrada; else a.push(entrada);
fs.writeFileSync(p, JSON.stringify(a, null, 2) + "\n");
