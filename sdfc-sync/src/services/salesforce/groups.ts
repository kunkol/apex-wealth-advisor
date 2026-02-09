import { SalesforceClient, SalesforceRecord } from './client.js';

export interface Group extends SalesforceRecord {
  Id: string;
  Name: string;
  DeveloperName?: string;
  Type: string; // Regular, Role, RoleAndSubordinates, etc.
  RelatedId?: string; // For Role-based groups, the role ID
  DoesIncludeBosses?: boolean;
}

export interface GroupMember extends SalesforceRecord {
  Id: string;
  GroupId: string;
  UserOrGroupId: string;
}

export interface GroupWithMembers {
  group: Group;
  members: GroupMember[];
}

export async function fetchGroups(client: SalesforceClient): Promise<Group[]> {
  const soql = `
    SELECT
      Id,
      Name,
      DeveloperName,
      Type,
      RelatedId,
      DoesIncludeBosses
    FROM Group
    ORDER BY Name
  `;

  return client.queryAll<Group>(soql);
}

export async function fetchPublicGroups(client: SalesforceClient): Promise<Group[]> {
  const soql = `
    SELECT
      Id,
      Name,
      DeveloperName,
      Type,
      RelatedId,
      DoesIncludeBosses
    FROM Group
    WHERE Type = 'Regular'
    ORDER BY Name
  `;

  return client.queryAll<Group>(soql);
}

export async function fetchGroupMembers(client: SalesforceClient): Promise<GroupMember[]> {
  const soql = `
    SELECT
      Id,
      GroupId,
      UserOrGroupId
    FROM GroupMember
  `;

  return client.queryAll<GroupMember>(soql);
}

export async function fetchGroupMembersByGroupId(
  client: SalesforceClient,
  groupId: string
): Promise<GroupMember[]> {
  const soql = `
    SELECT
      Id,
      GroupId,
      UserOrGroupId
    FROM GroupMember
    WHERE GroupId = '${groupId}'
  `;

  return client.queryAll<GroupMember>(soql);
}

export async function fetchGroupsWithMembers(client: SalesforceClient): Promise<GroupWithMembers[]> {
  const groups = await fetchGroups(client);
  const allMembers = await fetchGroupMembers(client);

  // Build a map of group ID to members
  const membersByGroup = new Map<string, GroupMember[]>();
  for (const member of allMembers) {
    const members = membersByGroup.get(member.GroupId) || [];
    members.push(member);
    membersByGroup.set(member.GroupId, members);
  }

  return groups.map((group) => ({
    group,
    members: membersByGroup.get(group.Id) || [],
  }));
}

export function isUserGroup(group: Group): boolean {
  return group.Type === 'Regular';
}

export function isRoleGroup(group: Group): boolean {
  return group.Type === 'Role' || group.Type === 'RoleAndSubordinates';
}
