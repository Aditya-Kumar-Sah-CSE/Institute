const fs = require('fs');
const path = 'd:/Institute/institute1/src/features/dashboard/pages/SharedDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/@\/app\/\[tenantSlug\]\/\(dashboard\)\/dashboard\/components/g, '@/features/dashboard/components');

fs.writeFileSync(path, content);
console.log("Imports fixed.");
