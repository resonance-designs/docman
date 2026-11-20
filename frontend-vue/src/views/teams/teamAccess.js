export const teamId = value => String(value?._id || value?.id || value || '');
export function teamAccess(team, user) {
  const userId = teamId(user), owner = Boolean(userId && teamId(team?.owner) === userId);
  const member = team?.members?.find(item => teamId(item.user) === userId);
  const superadmin = user?.role === 'superadmin';
  const editor = ['editor', 'admin', 'superadmin'].includes(user?.role);
  return {
    owner,
    member: owner || Boolean(member),
    manage: editor && (owner || member?.role === 'admin' || superadmin),
    remove: editor && (owner || superadmin),
    link: editor && (owner || member?.role === 'admin' || superadmin),
    invite: editor && (owner || member?.role === 'admin' || superadmin || (Boolean(member) && team?.settings?.allowMemberInvites)),
  };
}
