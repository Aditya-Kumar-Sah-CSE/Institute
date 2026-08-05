const fs = require('fs');
const path = require('path');

const b = "d:/Institute/institute1/src";

function mkdir(p) { fs.mkdirSync(path.join(b, p), { recursive: true }); }
mkdir("app/(platform)/admin");
mkdir("app/(platform)/dashboard");
mkdir("features/admin/layouts");
mkdir("features/admin/pages");

console.log("Scaffolded directories.");
