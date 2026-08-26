export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  target: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
  ip?: string;
}

const auditLogsStore: AuditLogEntry[] = [
  {
    id: 'log-initial-system',
    actorId: 'system-root',
    actorEmail: 'iambestadi@gmail.com',
    action: 'SUPER_ADMIN_SYSTEM_INITIALIZED',
    target: 'Platform Engine',
    oldValue: null,
    newValue: { status: 'ACTIVE', owner: 'iambestadi@gmail.com' },
    timestamp: new Date().toISOString(),
    ip: '127.0.0.1',
  },
];

export async function logAuditAction(params: {
  actorId: string;
  actorEmail: string;
  action: string;
  target: string;
  oldValue?: any;
  newValue?: any;
  ip?: string;
}): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    action: params.action,
    target: params.target,
    oldValue: params.oldValue,
    newValue: params.newValue,
    timestamp: new Date().toISOString(),
    ip: params.ip || '127.0.0.1',
  };

  auditLogsStore.unshift(entry);

  // Keep store capped at 500 recent logs
  if (auditLogsStore.length > 500) {
    auditLogsStore.length = 500;
  }

  console.log(`[AUDIT LOG] ${entry.actorEmail} executed ${entry.action} on ${entry.target}`);

  return entry;
}

export function getAuditLogs(): AuditLogEntry[] {
  return [...auditLogsStore];
}
