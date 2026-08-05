const fs = require('fs');
const source = "d:/Institute/institute1/src/app/[tenantSlug]/(dashboard)/dashboard/page.tsx";
const dest = "d:/Institute/institute1/src/features/dashboard/pages/SharedDashboard.tsx";

let content = fs.readFileSync(source, 'utf8');

// replace params.tenantSlug with context logic
content = content.replace(
  "export default async function DashboardPage(props: {",
  "import { RequestContext } from '@/lib/context/requestContext';\n\nexport default async function SharedDashboard(props: { context: RequestContext;"
);

content = content.replace("params: Promise<{ tenantSlug: string }>;", "");
content = content.replace("const { tenantSlug } = await props.params;", "const isPlatform = props.context.type === 'PLATFORM';\n  const tenantSlug = props.context.tenantSlug || '';");

content = content.replace(
  "const tenant = await resolveTenantCache(tenantSlug, 'development');",
  "let tenant = null;\n  if (!isPlatform && tenantSlug) {\n    tenant = await resolveTenantCache(tenantSlug, 'development');\n  }"
);

content = content.replace(
  "const DashboardProfileCard = dynamic(() => import('./components/DashboardProfileCard')",
  "const DashboardProfileCard = dynamic(() => import('@/app/[tenantSlug]/(dashboard)/dashboard/components/DashboardProfileCard')"
);

content = content.replace(
  "const PollAlerts = dynamic(() => import('./components/PollAlerts'));",
  "const PollAlerts = dynamic(() => import('@/app/[tenantSlug]/(dashboard)/dashboard/components/PollAlerts'));"
);

content = content.replace(
  "const DashboardPolls = dynamic(() => import('./components/DashboardPolls')",
  "const DashboardPolls = dynamic(() => import('@/app/[tenantSlug]/(dashboard)/dashboard/components/DashboardPolls')"
);

content = content.replace(
  "const ContinueLearning = dynamic(() => import('./components/ContinueLearning')",
  "const ContinueLearning = dynamic(() => import('@/app/[tenantSlug]/(dashboard)/dashboard/components/ContinueLearning')"
);

content = content.replace(
  "const DashboardAlerts = dynamic(() => import('./components/DashboardAlerts'));",
  "const DashboardAlerts = dynamic(() => import('@/app/[tenantSlug]/(dashboard)/dashboard/components/DashboardAlerts'));"
);

fs.writeFileSync(dest, content);
console.log("SharedDashboard logic ported.");
