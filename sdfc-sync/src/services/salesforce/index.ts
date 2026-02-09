export { SalesforceClient } from './client.js';
export type { QueryResult, SalesforceRecord, CreateResult, DeletedRecordsResult } from './client.js';

export { clientCredentialsAuth, revokeToken } from './auth.js';
export type { AuthResult } from './auth.js';

export { fetchUsers, fetchAdminUsers } from './users.js';
export type { User } from './users.js';

export {
  fetchRoles,
  fetchRoleById,
  buildRoleHierarchy,
  flattenHierarchy,
} from './roles.js';
export type { Role, RoleHierarchy } from './roles.js';

export {
  fetchGroups,
  fetchPublicGroups,
  fetchGroupMembers,
  fetchGroupMembersByGroupId,
  fetchGroupsWithMembers,
  isUserGroup,
  isRoleGroup,
} from './groups.js';
export type { Group, GroupMember, GroupWithMembers } from './groups.js';

export {
  fetchPermissionSets,
  fetchPermissionSetAssignments,
  fetchPermissionSetAssignmentsByPermSetId,
  fetchPermissionSetAssignmentsByUserId,
  fetchPermissionSetsWithAssignments,
} from './permsets.js';
export type {
  PermissionSet,
  PermissionSetAssignment,
  PermissionSetWithAssignments,
} from './permsets.js';

export { fetchAccountShares, fetchContactShares, accessLevelToRelation } from './shares.js';
export type { Share, AccessLevel, RowCause, ShareRelation, AccountShare, ContactShare } from './shares.js';

export {
  fetchAccounts,
  fetchContacts,
  fetchTasks,
  fetchRecordsByType,
  fetchDeletedRecords,
} from './records.js';
export type {
  Account,
  Contact,
  Task,
  RecordType,
  RecordFetchOptions,
  DeletedRecord,
} from './records.js';
