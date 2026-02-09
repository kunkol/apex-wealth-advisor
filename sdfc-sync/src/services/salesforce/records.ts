import { SalesforceClient, SalesforceRecord } from './client.js';

export interface Account extends SalesforceRecord {
  Id: string;
  Name: string;
  OwnerId: string;
  Industry?: string;
  Type?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  Owner?: {
    Id: string;
    Name: string;
  };
}

export interface Contact extends SalesforceRecord {
  Id: string;
  Name: string;
  FirstName?: string;
  LastName: string;
  OwnerId: string;
  AccountId?: string;
  Email?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  Owner?: {
    Id: string;
    Name: string;
  };
  Account?: {
    Id: string;
    Name: string;
  };
}

export interface Task extends SalesforceRecord {
  Id: string;
  Subject?: string;
  OwnerId: string;
  WhatId?: string;
  WhoId?: string;
  Status: string;
  Priority: string;
  CreatedDate: string;
  LastModifiedDate: string;
  Owner?: {
    Id: string;
    Name: string;
  };
}

export type RecordType = 'Account' | 'Contact' | 'Task';

export interface RecordFetchOptions {
  limit?: number;
  sinceDate?: Date;
}

function formatDateForSOQL(date: Date): string {
  return date.toISOString();
}

export async function fetchAccounts(client: SalesforceClient, options?: RecordFetchOptions): Promise<Account[]> {
  let soql = `
    SELECT
      Id,
      Name,
      OwnerId,
      Industry,
      Type,
      CreatedDate,
      LastModifiedDate,
      Owner.Id,
      Owner.Name
    FROM Account
  `;

  if (options?.sinceDate) {
    soql += ` WHERE LastModifiedDate >= ${formatDateForSOQL(options.sinceDate)}`;
  }

  soql += ' ORDER BY Name';

  if (options?.limit) {
    soql += ` LIMIT ${options.limit}`;
  }

  return client.queryAll<Account>(soql);
}

export async function fetchContacts(client: SalesforceClient, options?: RecordFetchOptions): Promise<Contact[]> {
  let soql = `
    SELECT
      Id,
      Name,
      FirstName,
      LastName,
      OwnerId,
      AccountId,
      Email,
      CreatedDate,
      LastModifiedDate,
      Owner.Id,
      Owner.Name,
      Account.Id,
      Account.Name
    FROM Contact
  `;

  if (options?.sinceDate) {
    soql += ` WHERE LastModifiedDate >= ${formatDateForSOQL(options.sinceDate)}`;
  }

  soql += ' ORDER BY Name';

  if (options?.limit) {
    soql += ` LIMIT ${options.limit}`;
  }

  return client.queryAll<Contact>(soql);
}

export async function fetchTasks(client: SalesforceClient, options?: RecordFetchOptions): Promise<Task[]> {
  let soql = `
    SELECT
      Id,
      Subject,
      OwnerId,
      WhatId,
      WhoId,
      Status,
      Priority,
      CreatedDate,
      LastModifiedDate,
      Owner.Id,
      Owner.Name
    FROM Task
  `;

  if (options?.sinceDate) {
    soql += ` WHERE LastModifiedDate >= ${formatDateForSOQL(options.sinceDate)}`;
  }

  soql += ' ORDER BY CreatedDate DESC';

  if (options?.limit) {
    soql += ` LIMIT ${options.limit}`;
  }

  return client.queryAll<Task>(soql);
}

export async function fetchRecordsByType(
  client: SalesforceClient,
  type: RecordType,
  options?: RecordFetchOptions
): Promise<SalesforceRecord[]> {
  switch (type) {
    case 'Account':
      return fetchAccounts(client, options);
    case 'Contact':
      return fetchContacts(client, options);
    case 'Task':
      return fetchTasks(client, options);
    default:
      throw new Error(`Unknown record type: ${type}`);
  }
}

export interface DeletedRecord {
  id: string;
  type: RecordType;
  deletedDate: string;
}

export async function fetchDeletedRecords(
  client: SalesforceClient,
  startDate: Date,
  endDate: Date
): Promise<DeletedRecord[]> {
  const recordTypes: RecordType[] = ['Account', 'Contact', 'Task'];
  const deletedRecords: DeletedRecord[] = [];

  for (const type of recordTypes) {
    try {
      const result = await client.getDeleted(type, startDate, endDate);
      for (const record of result.deletedRecords) {
        deletedRecords.push({
          id: record.id,
          type,
          deletedDate: record.deletedDate,
        });
      }
    } catch {
      continue;
    }
  }

  return deletedRecords;
}
