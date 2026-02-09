import { SalesforceClient, SalesforceRecord } from './client.js';

export interface Role extends SalesforceRecord {
  Id: string;
  Name: string;
  DeveloperName: string;
  ParentRoleId?: string;
  RollupDescription?: string;
}

export interface RoleHierarchy {
  role: Role;
  children: RoleHierarchy[];
}

export async function fetchRoles(client: SalesforceClient): Promise<Role[]> {
  const soql = `
    SELECT
      Id,
      Name,
      DeveloperName,
      ParentRoleId,
      RollupDescription
    FROM UserRole
    ORDER BY Name
  `;

  return client.queryAll<Role>(soql);
}

export async function fetchRoleById(client: SalesforceClient, roleId: string): Promise<Role | null> {
  const soql = `
    SELECT
      Id,
      Name,
      DeveloperName,
      ParentRoleId,
      RollupDescription
    FROM UserRole
    WHERE Id = '${roleId}'
  `;

  const result = await client.query<Role>(soql);
  return result.records.length > 0 ? result.records[0] : null;
}

export function buildRoleHierarchy(roles: Role[]): RoleHierarchy[] {
  const roleMap = new Map<string, Role>();
  const childrenMap = new Map<string, Role[]>();

  // Build maps
  for (const role of roles) {
    roleMap.set(role.Id, role);
    if (role.ParentRoleId) {
      const children = childrenMap.get(role.ParentRoleId) || [];
      children.push(role);
      childrenMap.set(role.ParentRoleId, children);
    }
  }

  // Build hierarchy recursively
  function buildNode(role: Role): RoleHierarchy {
    const children = childrenMap.get(role.Id) || [];
    return {
      role,
      children: children.map((child) => buildNode(child)),
    };
  }

  // Find root roles (no parent)
  const rootRoles = roles.filter((r) => !r.ParentRoleId);
  return rootRoles.map((root) => buildNode(root));
}

export function flattenHierarchy(hierarchies: RoleHierarchy[]): Array<{ role: Role; depth: number }> {
  const result: Array<{ role: Role; depth: number }> = [];

  function traverse(hierarchy: RoleHierarchy, depth: number): void {
    result.push({ role: hierarchy.role, depth });
    for (const child of hierarchy.children) {
      traverse(child, depth + 1);
    }
  }

  for (const hierarchy of hierarchies) {
    traverse(hierarchy, 0);
  }

  return result;
}
