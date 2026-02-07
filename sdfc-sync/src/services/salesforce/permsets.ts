import { SalesforceClient, SalesforceRecord } from './client.js';

export interface PermissionSet extends SalesforceRecord {
  Id: string;
  Name: string;
  Label: string;
  Description?: string;
  IsOwnedByProfile: boolean;
  ProfileId?: string;
  PermissionsModifyAllData?: boolean;
  PermissionsViewAllData?: boolean;
}

export interface PermissionSetAssignment extends SalesforceRecord {
  Id: string;
  AssigneeId: string;
  PermissionSetId: string;
  PermissionSet?: {
    Id: string;
    Name: string;
    Label: string;
  };
  Assignee?: {
    Id: string;
    Name: string;
  };
}

export interface PermissionSetWithAssignments {
  permissionSet: PermissionSet;
  assignments: PermissionSetAssignment[];
}

export async function fetchPermissionSets(client: SalesforceClient): Promise<PermissionSet[]> {
  const soql = `
    SELECT
      Id,
      Name,
      Label,
      Description,
      IsOwnedByProfile,
      ProfileId,
      PermissionsModifyAllData,
      PermissionsViewAllData
    FROM PermissionSet
    WHERE IsOwnedByProfile = false
    ORDER BY Label
  `;

  return client.queryAll<PermissionSet>(soql);
}

export async function fetchPermissionSetAssignments(
  client: SalesforceClient
): Promise<PermissionSetAssignment[]> {
  const soql = `
    SELECT
      Id,
      AssigneeId,
      PermissionSetId,
      PermissionSet.Id,
      PermissionSet.Name,
      PermissionSet.Label,
      Assignee.Id,
      Assignee.Name
    FROM PermissionSetAssignment
    WHERE PermissionSet.IsOwnedByProfile = false
  `;

  return client.queryAll<PermissionSetAssignment>(soql);
}

export async function fetchPermissionSetAssignmentsByPermSetId(
  client: SalesforceClient,
  permSetId: string
): Promise<PermissionSetAssignment[]> {
  const soql = `
    SELECT
      Id,
      AssigneeId,
      PermissionSetId,
      Assignee.Id,
      Assignee.Name
    FROM PermissionSetAssignment
    WHERE PermissionSetId = '${permSetId}'
  `;

  return client.queryAll<PermissionSetAssignment>(soql);
}

export async function fetchPermissionSetAssignmentsByUserId(
  client: SalesforceClient,
  userId: string
): Promise<PermissionSetAssignment[]> {
  const soql = `
    SELECT
      Id,
      AssigneeId,
      PermissionSetId,
      PermissionSet.Id,
      PermissionSet.Name,
      PermissionSet.Label
    FROM PermissionSetAssignment
    WHERE AssigneeId = '${userId}'
    AND PermissionSet.IsOwnedByProfile = false
  `;

  return client.queryAll<PermissionSetAssignment>(soql);
}

export async function fetchPermissionSetsWithAssignments(
  client: SalesforceClient
): Promise<PermissionSetWithAssignments[]> {
  const permSets = await fetchPermissionSets(client);
  const allAssignments = await fetchPermissionSetAssignments(client);

  // Build a map of permission set ID to assignments
  const assignmentsByPermSet = new Map<string, PermissionSetAssignment[]>();
  for (const assignment of allAssignments) {
    const assignments = assignmentsByPermSet.get(assignment.PermissionSetId) || [];
    assignments.push(assignment);
    assignmentsByPermSet.set(assignment.PermissionSetId, assignments);
  }

  return permSets.map((permSet) => ({
    permissionSet: permSet,
    assignments: assignmentsByPermSet.get(permSet.Id) || [],
  }));
}
