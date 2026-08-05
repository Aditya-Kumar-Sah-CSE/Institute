const fs = require('fs');
const path = require('path');
const b = "d:/Institute/institute1/src";

fs.mkdirSync(path.join(b, "features/admin/components"), { recursive: true });
fs.renameSync(
  path.join(b, "app/[tenantSlug]/(admin)/admin/components/ExpandableSettingsCard.tsx"),
  path.join(b, "features/admin/components/ExpandableSettingsCard.tsx")
);
console.log("Moved ExpandableSettingsCard.");
