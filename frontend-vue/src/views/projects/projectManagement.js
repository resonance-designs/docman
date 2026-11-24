export const projectStatuses = ['active', 'on-hold', 'completed', 'archived'];
export const projectPriorities = ['low', 'medium', 'high', 'critical'];
export const collaboratorRoles = ['viewer', 'contributor', 'manager'];
export const entityId = value => String(value?._id || value?.id || value || '');
export function projectPermissions(project, user) {
  const id = entityId(user), role = user?.role;
  const writableRole = ['editor', 'admin', 'superadmin'].includes(role);
  const owner = Boolean(id && entityId(project?.owner) === id);
  const manager = (project?.collaborators || []).some(member => entityId(member.user) === id && member.role === 'manager');
  return { create: writableRole, manage: writableRole && (owner || manager || role === 'superadmin'), delete: writableRole && (owner || role === 'superadmin') };
}
export function projectPayload(form, originalTeamIds = null) {
  const name = String(form.name || '').trim();
  if (!name || name.length > 100) throw new Error('Enter a project name of 1–100 characters.');
  if (String(form.description || '').length > 1000) throw new Error('Description cannot exceed 1,000 characters.');
  if (!Array.isArray(form.teamIds) || !form.teamIds.length) throw new Error('Select at least one team.');
  if (!projectStatuses.includes(form.status) || !projectPriorities.includes(form.priority)) throw new Error('Choose a valid status and priority.');
  if (form.startDate && form.endDate && form.endDate < form.startDate) throw new Error('End date cannot be before start date.');
  const tags = [...new Set(String(form.tagsText || '').split(',').map(tag => tag.trim()).filter(Boolean))];
  if (tags.some(tag => tag.length > 50)) throw new Error('Each tag must be 50 characters or fewer.');
  const payload = { name, description: String(form.description || '').trim(), teamIds: [...new Set(form.teamIds.map(entityId))], status: form.status, priority: form.priority, startDate: form.startDate || null, endDate: form.endDate || null, tags };
  if (originalTeamIds !== null && JSON.stringify([...new Set(originalTeamIds.map(entityId))].sort()) === JSON.stringify([...payload.teamIds].sort())) delete payload.teamIds;
  return payload;
}
