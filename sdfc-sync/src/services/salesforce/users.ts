import { SalesforceClient, SalesforceRecord } from './client.js';

export interface User extends SalesforceRecord {
  Id: string;
  Username: string;
  Name: string;
  Email: string;
  IsActive: boolean;
  UserRoleId?: string;
  ProfileId: string;
  UserRole?: {
    Id: string;
    Name: string;
  };
  Profile?: {
    Id: string;
    Name: string;
  };
}

export async function fetchUsers(client: SalesforceClient): Promise<User[]> {
  const soql = `
    SELECT
      Id,
      Username,
      Name,
      Email,
      IsActive,
      UserRoleId,
      ProfileId,
      UserRole.Id,
      UserRole.Name,
      Profile.Id,
      Profile.Name
    FROM User
    WHERE IsActive = true
    ORDER BY Name
  `;

  return client.queryAll<User>(soql);
}

export async function fetchUserById(client: SalesforceClient, userId: string): Promise<User | null> {
  const soql = `
    SELECT
      Id,
      Username,
      Name,
      Email,
      IsActive,
      UserRoleId,
      ProfileId,
      UserRole.Id,
      UserRole.Name,
      Profile.Id,
      Profile.Name
    FROM User
    WHERE Id = '${userId}'
  `;

  const result = await client.query<User>(soql);
  return result.records.length > 0 ? result.records[0] : null;
}

export async function fetchAdminUsers(client: SalesforceClient): Promise<User[]> {
  // Users with "Modify All Data" or "System Administrator" profile are considered admins
  const soql = `
    SELECT
      Id,
      Username,
      Name,
      Email,
      IsActive,
      UserRoleId,
      ProfileId,
      Profile.Name
    FROM User
    WHERE IsActive = true
    AND Profile.Name = 'System Administrator'
    ORDER BY Name
  `;

  return client.queryAll<User>(soql);
}
