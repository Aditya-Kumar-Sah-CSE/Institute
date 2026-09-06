/**
 * Helper utility to apply explicit data-agent-* semantic attributes to UI components.
 * Serves as a clean semantic contract between rendered React components and Smart Agent.
 */

export interface AgentAttributeProps {
  label?: string;
  action?: string;
  description?: string;
  role?: string;
  entityType?: 'course' | 'sheet' | 'problem' | 'certificate' | 'routine' | 'goal' | 'general';
  entityId?: string;
}

export function agentAttrs(props: AgentAttributeProps): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (props.label) attrs['data-agent-label'] = props.label;
  if (props.action) attrs['data-agent-action'] = props.action;
  if (props.description) attrs['data-agent-description'] = props.description;
  if (props.role) attrs['data-agent-role'] = props.role;
  if (props.entityType) attrs['data-agent-entity-type'] = props.entityType;
  if (props.entityId) attrs['data-agent-entity-id'] = props.entityId;
  return attrs;
}
