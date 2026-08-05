const fs = require('fs');
const path = require('path');
const b = "d:/Institute/institute1/src";

fs.mkdirSync(path.join(b, "features/dashboard/components"), { recursive: true });

const oldDir = path.join(b, "app/[tenantSlug]/(dashboard)/dashboard/components");
if (fs.existsSync(oldDir)) {
  const files = fs.readdirSync(oldDir);
  for (const file of files) {
    fs.renameSync(path.join(oldDir, file), path.join(b, "features/dashboard/components", file));
  }
  // Try to remove old dir if empty
  try { fs.rmdirSync(oldDir); } catch(e) {}
  console.log("Moved dashboard components.");
} else {
  console.log("Components dir not found or already moved.");
}
