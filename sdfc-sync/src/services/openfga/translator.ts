import { Tuple } from './client.js';
import {
  User,
  Role,
  Group,
  GroupMember,
  PermissionSetAssignment,
  Account,
  Contact,
  Task,
  AccountShare,
  ContactShare,
  accessLevelToRelation,
} from '../salesforce/index.js';

const DEFAULT_ORG_ID = 'org1';

export interface TranslationResult {
  tuples: Tuple[];
  stats: {
    users: number;
    roles: number;
    groups: number;
    groupMembers: number;
    permissionSetAssignments: number;
    accounts: number;
    contacts: number;
    tasks: number;
    shares: number;
    industryRestrictions: number;
  };
}

export function translateUsers(users: User[], adminUserIds: Set<string>, orgId: string = DEFAULT_ORG_ID): Tuple[] {
  const tuples: Tuple[] = [];

  for (const user of users) {
    tuples.push({
      user: `user:${user.Id}`,
      relation: 'member',
      object: `organization:${orgId}`,
    });

    if (adminUserIds.has(user.Id)) {
      tuples.push({
        user: `user:${user.Id}`,
        relation: 'admin',
        object: `organization:${orgId}`,
      });
    }

    if (user.UserRoleId) {
      tuples.push({
        user: `user:${user.Id}`,
        relation: 'assignee',
        object: `role:${user.UserRoleId}`,
      });
    }
  }

  return tuples;
}

export function translateRoles(roles: Role[]): Tuple[] {
  const tuples: Tuple[] = [];

  for (const role of roles) {
    if (role.ParentRoleId) {
      tuples.push({
        user: `role:${role.ParentRoleId}`,
        relation: 'parent',
        object: `role:${role.Id}`,
      });
    }
  }

  return tuples;
}

export function translateGroups(_groups: Group[]): Tuple[] {
  return [];
}

export function translateGroupMembers(members: GroupMember[], _groups: Group[]): Tuple[] {
  const tuples: Tuple[] = [];

  for (const member of members) {
    const memberIdPrefix = member.UserOrGroupId.substring(0, 3);

    if (memberIdPrefix === '005') {
      tuples.push({
        user: `user:${member.UserOrGroupId}`,
        relation: 'member',
        object: `group:${member.GroupId}`,
      });
    } else if (memberIdPrefix === '00G') {
      tuples.push({
        user: `group:${member.UserOrGroupId}#member`,
        relation: 'member',
        object: `group:${member.GroupId}`,
      });
    }
  }

  return tuples;
}

export function translatePermissionSetAssignments(assignments: PermissionSetAssignment[]): Tuple[] {
  const tuples: Tuple[] = [];

  for (const assignment of assignments) {
    tuples.push({
      user: `user:${assignment.AssigneeId}`,
      relation: 'assignee',
      object: `permission_set:${assignment.PermissionSetId}`,
    });
  }

  return tuples;
}

export function translateAccounts(
  accounts: Account[],
  userRoleMap: Map<string, string>,
  orgId: string = DEFAULT_ORG_ID
): Tuple[] {
  const tuples: Tuple[] = [];

  for (const account of accounts) {
    tuples.push({
      user: `organization:${orgId}`,
      relation: 'organization',
      object: `account:${account.Id}`,
    });

    tuples.push({
      user: `user:${account.OwnerId}`,
      relation: 'owner',
      object: `account:${account.Id}`,
    });

    const ownerRoleId = userRoleMap.get(account.OwnerId);
    if (ownerRoleId) {
      tuples.push({
        user: `role:${ownerRoleId}`,
        relation: 'owner_role',
        object: `account:${account.Id}`,
      });
    }

    if (account.Industry) {
      tuples.push({
        user: `industry:${account.Industry.replace(/\s+/g, '_').toLowerCase()}`,
        relation: 'industry',
        object: `account:${account.Id}`,
      });
    }
  }

  return tuples;
}

export function translateContacts(contacts: Contact[], orgId: string = DEFAULT_ORG_ID): Tuple[] {
  const tuples: Tuple[] = [];

  for (const contact of contacts) {
    tuples.push({
      user: `organization:${orgId}`,
      relation: 'organization',
      object: `contact:${contact.Id}`,
    });

    tuples.push({
      user: `user:${contact.OwnerId}`,
      relation: 'owner',
      object: `contact:${contact.Id}`,
    });

    if (contact.AccountId) {
      tuples.push({
        user: `account:${contact.AccountId}`,
        relation: 'parent_account',
        object: `contact:${contact.Id}`,
      });
    }
  }

  return tuples;
}

export function translateTasks(tasks: Task[], orgId: string = DEFAULT_ORG_ID): Tuple[] {
  const tuples: Tuple[] = [];

  for (const task of tasks) {
    tuples.push({
      user: `organization:${orgId}`,
      relation: 'organization',
      object: `task:${task.Id}`,
    });

    tuples.push({
      user: `user:${task.OwnerId}`,
      relation: 'owner',
      object: `task:${task.Id}`,
    });

    if (task.WhatId) {
      const parentType = getObjectTypeFromId(task.WhatId);
      if (parentType) {
        tuples.push({
          user: `${parentType}:${task.WhatId}`,
          relation: 'parent_record',
          object: `task:${task.Id}`,
        });
      }
    }
  }

  return tuples;
}

export function translateAccountShares(shares: AccountShare[]): Tuple[] {
  const tuples: Tuple[] = [];

  for (const share of shares) {
    const relation = accessLevelToRelation(share.AccountAccessLevel);
    if (!relation) {
      continue;
    }
    const userOrGroup = formatUserOrGroup(share.UserOrGroupId);

    tuples.push({
      user: userOrGroup,
      relation,
      object: `account:${share.AccountId}`,
    });
  }

  return tuples;
}

export function translateContactShares(shares: ContactShare[]): Tuple[] {
  const tuples: Tuple[] = [];

  for (const share of shares) {
    const relation = accessLevelToRelation(share.ContactAccessLevel);
    if (!relation) {
      continue;
    }
    const userOrGroup = formatUserOrGroup(share.UserOrGroupId);

    tuples.push({
      user: userOrGroup,
      relation,
      object: `contact:${share.ContactId}`,
    });
  }

  return tuples;
}

export function translateContactPermissionsFromAccountShares(shares: AccountShare[], contacts: Contact[]): Tuple[] {
  const tuples: Tuple[] = [];
  const contactsByAccountId = new Map<string, string[]>();

  for (const contact of contacts) {
    if (!contact.AccountId) {
      continue;
    }
    const ids = contactsByAccountId.get(contact.AccountId) || [];
    ids.push(contact.Id);
    contactsByAccountId.set(contact.AccountId, ids);
  }

  for (const share of shares) {
    const relation = accessLevelToRelation(share.ContactAccessLevel);
    if (!relation) {
      continue;
    }

    const contactIds = contactsByAccountId.get(share.AccountId);
    if (!contactIds || contactIds.length === 0) {
      continue;
    }

    const userOrGroup = formatUserOrGroup(share.UserOrGroupId);
    for (const contactId of contactIds) {
      tuples.push({
        user: userOrGroup,
        relation,
        object: `contact:${contactId}`,
      });
    }
  }

  return tuples;
}

export function translateIndustryRestrictions(
  restrictedUsers: Array<{ userId: string; industry: string }>
): Tuple[] {
  const tuples: Tuple[] = [];

  for (const restriction of restrictedUsers) {
    const industryId = restriction.industry.replace(/\s+/g, '_').toLowerCase();
    tuples.push({
      user: `user:${restriction.userId}`,
      relation: 'restricted_user',
      object: `industry:${industryId}`,
    });
  }

  return tuples;
}

function formatUserOrGroup(userOrGroupId: string): string {
  const prefix = userOrGroupId.substring(0, 3);
  if (prefix === '005') {
    return `user:${userOrGroupId}`;
  }
  if (prefix === '00G') {
    return `group:${userOrGroupId}#member`;
  }
  return `user:${userOrGroupId}`;
}

function getObjectTypeFromId(id: string): string | null {
  const prefix = id.substring(0, 3);
  const prefixMap: Record<string, string> = {
    '001': 'account',
    '003': 'contact',
  };
  return prefixMap[prefix] || null;
}

export function translateAll(data: {
  users: User[];
  adminUserIds: Set<string>;
  roles: Role[];
  groups: Group[];
  groupMembers: GroupMember[];
  permissionSetAssignments: PermissionSetAssignment[];
  accounts: Account[];
  contacts: Contact[];
  tasks: Task[];
  accountShares: AccountShare[];
  contactShares: ContactShare[];
  industryRestrictions: Array<{ userId: string; industry: string }>;
  orgId?: string;
}): TranslationResult {
  const orgId = data.orgId || DEFAULT_ORG_ID;
  const allTuples: Tuple[] = [];

  const userRoleMap = new Map<string, string>();
  for (const user of data.users) {
    if (user.UserRoleId) {
      userRoleMap.set(user.Id, user.UserRoleId);
    }
  }

  allTuples.push(...translateUsers(data.users, data.adminUserIds, orgId));
  allTuples.push(...translateRoles(data.roles));
  allTuples.push(...translateGroupMembers(data.groupMembers, data.groups));
  allTuples.push(...translatePermissionSetAssignments(data.permissionSetAssignments));
  allTuples.push(...translateAccounts(data.accounts, userRoleMap, orgId));
  allTuples.push(...translateContacts(data.contacts, orgId));
  allTuples.push(...translateTasks(data.tasks, orgId));
  allTuples.push(...translateAccountShares(data.accountShares));
  allTuples.push(...translateContactPermissionsFromAccountShares(data.accountShares, data.contacts));
  allTuples.push(...translateContactShares(data.contactShares));
  allTuples.push(...translateIndustryRestrictions(data.industryRestrictions));

  return {
    tuples: allTuples,
    stats: {
      users: data.users.length,
      roles: data.roles.length,
      groups: data.groups.length,
      groupMembers: data.groupMembers.length,
      permissionSetAssignments: data.permissionSetAssignments.length,
      accounts: data.accounts.length,
      contacts: data.contacts.length,
      tasks: data.tasks.length,
      shares: data.accountShares.length + data.contactShares.length,
      industryRestrictions: data.industryRestrictions.length,
    },
  };
}
