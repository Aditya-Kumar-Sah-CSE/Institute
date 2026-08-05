const fs = require('fs');
const path = require('path');
const b = "d:/Institute/institute1/src";

fs.mkdirSync(path.join(b, "features/dashboard/layouts"), { recursive: true });
fs.mkdirSync(path.join(b, "features/dashboard/pages"), { recursive: true });
