import test from 'node:test';
import assert from 'node:assert/strict';
import { teamAccess, teamId } from './teamAccess.js';
const team = { owner: { _id: 'owner' }, members: [{ user: { _id: 'manager' }, role: 'admin' }, { user: 'member', role: 'member' }], settings: { allowMemberInvites: true } };
test('owner editor can manage and delete; viewer ownership does not elevate application role', () => {
  assert.equal(teamAccess(team, { _id: 'owner', role: 'editor' }).remove, true);
  assert.equal(teamAccess(team, { _id: 'owner', role: 'viewer' }).manage, false);
});
test('team admin can manage members but cannot delete team', () => {
  const permission = teamAccess(team, { id: 'manager', role: 'editor' });
  assert.equal(permission.manage, true); assert.equal(permission.remove, false);
});
test('ordinary member can invite only when policy and application role permit', () => {
  assert.equal(teamAccess(team, { id: 'member', role: 'editor' }).invite, true);
  assert.equal(teamAccess(team, { id: 'member', role: 'viewer' }).invite, false);
  assert.equal(teamAccess({ ...team, settings: { allowMemberInvites: false } }, { id: 'member', role: 'editor' }).invite, false);
});
test('outsider editor cannot manage, invite or link resources', () => {
  const permission = teamAccess(team, { id: 'other', role: 'editor' });
  assert.equal(permission.manage, false); assert.equal(permission.invite, false); assert.equal(permission.link, false);
});
test('unassigned global admin cannot manage another team or link resources', () => {
  const permission = teamAccess(team, { id: 'other', role: 'admin' });
  assert.equal(permission.link, false); assert.equal(permission.manage, false); assert.equal(permission.remove, false);
});
test('superadmin can manage and populated/string identifiers agree', () => {
  assert.equal(teamAccess(team, { id: 'other', role: 'superadmin' }).remove, true);
  assert.equal(teamId({ _id: 'owner' }), teamId('owner'));
});
