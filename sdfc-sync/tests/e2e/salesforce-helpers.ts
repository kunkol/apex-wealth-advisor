import { loadConfig, isAuthenticated, isTokenExpired, Config } from '../../src/config/index.js';
import { SalesforceClient } from '../../src/services/salesforce/client.js';
import { User } from '../../src/services/salesforce/users.js';

export const TEST_PREFIX = 'E2E_SYNC_DEMO_';
type ShareAccessLevel = 'None' | 'Read' | 'Edit' | 'All';

interface RoleRecord {
  Id: string;
  ParentRoleId?: string;
}

interface CreatedResources {
  accounts: string[];
  contacts: string[];
  tasks: string[];
  groups: string[];
  groupMembers: string[];
  accountShares: string[];
}

export interface AccountShareRecord {
  Id: string;
  AccountId: string;
  UserOrGroupId: string;
  AccountAccessLevel: ShareAccessLevel;
  ContactAccessLevel?: ShareAccessLevel;
}

export interface ContactShareRecord {
  Id: string;
  ContactId: string;
  UserOrGroupId: string;
  ContactAccessLevel: ShareAccessLevel;
}

export class SalesforceTestHelper {
  private client: SalesforceClient;
  private createdResources: CreatedResources = {
    accounts: [],
    contacts: [],
    tasks: [],
    groups: [],
    groupMembers: [],
    accountShares: [],
  };

  constructor(private readonly config: Config) {
    this.client = new SalesforceClient(config, false);
  }

  getConfig(): Config {
    return this.config;
  }

  getSalesforceClient(): SalesforceClient {
    return this.client;
  }

  async getTestUsers(): Promise<{ users: User[]; adminUsers: User[] }> {
    const users = await this.client.queryAll<User>(`
      SELECT Id, Username, Name, Email, IsActive, UserRoleId, ProfileId,
             UserRole.Id, UserRole.Name, Profile.Id, Profile.Name
      FROM User
      WHERE IsActive = true
      ORDER BY Name
      LIMIT 30
    `);

    const adminUsers = await this.client.queryAll<User>(`
      SELECT Id, Username, Name, Email, IsActive, UserRoleId, ProfileId, Profile.Name
      FROM User
      WHERE IsActive = true AND Profile.Name = 'System Administrator'
      ORDER BY Name
      LIMIT 5
    `);

    return { users, adminUsers };
  }

  async getRoles(): Promise<RoleRecord[]> {
    return this.client.queryAll<RoleRecord>(`
      SELECT Id, ParentRoleId
      FROM UserRole
    `);
  }

  async createPublicGroup(name: string): Promise<string> {
    const timestamp = Date.now();
    const groupName = `${TEST_PREFIX}${name}_${timestamp}`;
    const developerName = groupName.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 80);

    const result = await this.client.create('Group', {
      Name: groupName,
      DeveloperName: developerName,
      Type: 'Regular',
    });

    if (!result.success) {
      throw new Error(`Failed to create Group: ${result.errors.map((e) => e.message).join(', ')}`);
    }

    this.createdResources.groups.push(result.id);
    return result.id;
  }

  async addGroupMember(groupId: string, userOrGroupId: string): Promise<string> {
    const result = await this.client.create('GroupMember', {
      GroupId: groupId,
      UserOrGroupId: userOrGroupId,
    });

    if (!result.success) {
      throw new Error(`Failed to create GroupMember: ${result.errors.map((e) => e.message).join(', ')}`);
    }

    this.createdResources.groupMembers.push(result.id);
    return result.id;
  }

  async createTestAccount(name: string, ownerId: string, industry?: string): Promise<string> {
    const result = await this.client.create('Account', {
      Name: `${TEST_PREFIX}${name}`,
      OwnerId: ownerId,
      Industry: industry,
    });

    if (!result.success) {
      throw new Error(`Failed to create Account: ${result.errors.map((e) => e.message).join(', ')}`);
    }

    this.createdResources.accounts.push(result.id);
    return result.id;
  }

  async createTestContact(accountId: string, ownerId: string): Promise<string> {
    const result = await this.client.create('Contact', {
      FirstName: `${TEST_PREFIX}First`,
      LastName: `Last_${Date.now()}`,
      AccountId: accountId,
      OwnerId: ownerId,
    });

    if (!result.success) {
      throw new Error(`Failed to create Contact: ${result.errors.map((e) => e.message).join(', ')}`);
    }

    this.createdResources.contacts.push(result.id);
    return result.id;
  }

  async createTestTask(whatId: string, ownerId: string): Promise<string> {
    const result = await this.client.create('Task', {
      Subject: `${TEST_PREFIX}Task_${Date.now()}`,
      WhatId: whatId,
      OwnerId: ownerId,
      Status: 'Not Started',
      Priority: 'Normal',
    });

    if (!result.success) {
      throw new Error(`Failed to create Task: ${result.errors.map((e) => e.message).join(', ')}`);
    }

    this.createdResources.tasks.push(result.id);
    return result.id;
  }

  async createAccountShare(
    accountId: string,
    userOrGroupId: string,
    accessLevel: 'Read' | 'Edit' | 'All'
  ): Promise<string> {
    const result = await this.client.create('AccountShare', {
      AccountId: accountId,
      UserOrGroupId: userOrGroupId,
      AccountAccessLevel: accessLevel,
    });

    if (!result.success) {
      throw new Error(`Failed to create AccountShare: ${result.errors.map((e) => e.message).join(', ')}`);
    }

    this.createdResources.accountShares.push(result.id);
    return result.id;
  }

  async deleteAccountShare(shareId: string): Promise<void> {
    await this.client.delete('AccountShare', shareId);
    this.createdResources.accountShares = this.createdResources.accountShares.filter((id) => id !== shareId);
  }

  async getAccountShareById(shareId: string): Promise<AccountShareRecord | null> {
    const shares = await this.client.queryAll<AccountShareRecord>(`
      SELECT Id, AccountId, UserOrGroupId, AccountAccessLevel, ContactAccessLevel
      FROM AccountShare
      WHERE Id = '${shareId}'
      LIMIT 1
    `);

    return shares[0] ?? null;
  }

  async findAnyContactShare(): Promise<ContactShareRecord | null> {
    try {
      const shares = await this.client.queryAll<ContactShareRecord>(`
        SELECT Id, ContactId, UserOrGroupId, ContactAccessLevel
        FROM ContactShare
        WHERE ContactAccessLevel IN ('Read', 'Edit')
        LIMIT 1
      `);
      return shares[0] ?? null;
    } catch {
      return null;
    }
  }

  async changeAccountOwner(accountId: string, newOwnerId: string): Promise<void> {
    await this.client.update('Account', accountId, { OwnerId: newOwnerId });
  }

  async deleteRecord(objectType: 'Task' | 'Contact' | 'Account', id: string): Promise<void> {
    await this.client.delete(objectType, id);
    if (objectType === 'Task') {
      this.createdResources.tasks = this.createdResources.tasks.filter((v) => v !== id);
    }
    if (objectType === 'Contact') {
      this.createdResources.contacts = this.createdResources.contacts.filter((v) => v !== id);
    }
    if (objectType === 'Account') {
      this.createdResources.accounts = this.createdResources.accounts.filter((v) => v !== id);
    }
  }

  async cleanup(): Promise<void> {
    for (const id of this.createdResources.accountShares) {
      try {
        await this.client.delete('AccountShare', id);
      } catch {
        // Ignore cleanup errors.
      }
    }

    for (const id of this.createdResources.tasks) {
      try {
        await this.client.delete('Task', id);
      } catch {
        // Ignore cleanup errors.
      }
    }

    for (const id of this.createdResources.contacts) {
      try {
        await this.client.delete('Contact', id);
      } catch {
        // Ignore cleanup errors.
      }
    }

    for (const id of this.createdResources.groupMembers) {
      try {
        await this.client.delete('GroupMember', id);
      } catch {
        // Ignore cleanup errors.
      }
    }

    for (const id of this.createdResources.groups) {
      try {
        await this.client.delete('Group', id);
      } catch {
        // Ignore cleanup errors.
      }
    }

    for (const id of this.createdResources.accounts) {
      try {
        await this.client.delete('Account', id);
      } catch {
        // Ignore cleanup errors.
      }
    }

    this.createdResources = {
      accounts: [],
      contacts: [],
      tasks: [],
      groups: [],
      groupMembers: [],
      accountShares: [],
    };
  }

  async cleanupStaleTestData(): Promise<void> {
    const staleShares = await this.client.queryAll<{ Id: string }>(
      `SELECT Id FROM AccountShare WHERE Account.Name LIKE '${TEST_PREFIX}%'`
    );
    for (const share of staleShares) {
      try {
        await this.client.delete('AccountShare', share.Id);
      } catch {
        // Ignore cleanup errors.
      }
    }

    const staleTasks = await this.client.queryAll<{ Id: string }>(
      `SELECT Id FROM Task WHERE Subject LIKE '${TEST_PREFIX}%'`
    );
    for (const task of staleTasks) {
      try {
        await this.client.delete('Task', task.Id);
      } catch {
        // Ignore cleanup errors.
      }
    }

    const staleContacts = await this.client.queryAll<{ Id: string }>(
      `SELECT Id FROM Contact WHERE FirstName LIKE '${TEST_PREFIX}%'`
    );
    for (const contact of staleContacts) {
      try {
        await this.client.delete('Contact', contact.Id);
      } catch {
        // Ignore cleanup errors.
      }
    }

    const staleAccounts = await this.client.queryAll<{ Id: string }>(
      `SELECT Id FROM Account WHERE Name LIKE '${TEST_PREFIX}%'`
    );
    for (const account of staleAccounts) {
      try {
        await this.client.delete('Account', account.Id);
      } catch {
        // Ignore cleanup errors.
      }
    }

    const staleGroups = await this.client.queryAll<{ Id: string }>(
      `SELECT Id FROM Group WHERE Type = 'Regular' AND Name LIKE '${TEST_PREFIX}%'`
    );
    for (const group of staleGroups) {
      try {
        await this.client.delete('Group', group.Id);
      } catch {
        // Ignore cleanup errors.
      }
    }
  }
}

function getConfigPath(): string | undefined {
  return process.env.SDFC_SYNC_DEMO_CONFIG;
}

export function shouldRunFullE2E(): boolean {
  if (process.env.E2E_TEST !== 'true') {
    return false;
  }

  try {
    const config = loadConfig(getConfigPath());
    return isAuthenticated(config) && !isTokenExpired(config);
  } catch {
    return false;
  }
}

export function getSalesforceConfig(): Config | null {
  try {
    const config = loadConfig(getConfigPath());
    if (!isAuthenticated(config) || isTokenExpired(config)) {
      return null;
    }
    return config;
  } catch {
    return null;
  }
}

export function getTestConfigPath(): string | undefined {
  return getConfigPath();
}
