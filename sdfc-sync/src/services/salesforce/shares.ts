import { SalesforceClient, SalesforceRecord } from './client.js';

export type AccessLevel = 'None' | 'Read' | 'Edit' | 'All';
export type RowCause = 'Manual' | 'Owner' | 'Rule' | 'ImplicitChild' | 'ImplicitParent' | 'Team';
export type ShareRelation = 'viewer' | 'editor' | 'owner';

export interface Share extends SalesforceRecord {
  Id: string;
  ParentId: string;
  UserOrGroupId: string;
  AccessLevel: AccessLevel;
  RowCause: RowCause;
}

export interface AccountShare extends Share {
  AccountId: string;
  AccountAccessLevel: AccessLevel;
  OpportunityAccessLevel?: AccessLevel;
  CaseAccessLevel?: AccessLevel;
  ContactAccessLevel?: AccessLevel;
}

export interface ContactShare extends Share {
  ContactId: string;
  ContactAccessLevel: AccessLevel;
}

export async function fetchAccountShares(client: SalesforceClient): Promise<AccountShare[]> {
  const soql = `
    SELECT
      Id,
      AccountId,
      UserOrGroupId,
      AccountAccessLevel,
      OpportunityAccessLevel,
      CaseAccessLevel,
      ContactAccessLevel,
      RowCause
    FROM AccountShare
    WHERE RowCause IN ('Manual', 'Rule')
  `;

  const results = await client.queryAll<AccountShare>(soql);
  return results.map((r) => ({
    ...r,
    ParentId: r.AccountId,
    AccessLevel: r.AccountAccessLevel,
  }));
}

export async function fetchContactShares(client: SalesforceClient): Promise<ContactShare[]> {
  try {
    const soql = `
      SELECT
        Id,
        ContactId,
        UserOrGroupId,
        ContactAccessLevel,
        RowCause
      FROM ContactShare
      WHERE ContactAccessLevel IN ('Read', 'Edit')
    `;

    const results = await client.queryAll<ContactShare>(soql);
    return results.map((r) => ({
      ...r,
      ParentId: r.ContactId,
      AccessLevel: r.ContactAccessLevel,
    }));
  } catch (error) {
    if (!isUnsupportedContactShareError(error)) {
      throw error;
    }

    // Some orgs do not expose ContactShare rows through the API.
    return [];
  }
}

function isUnsupportedContactShareError(error: unknown): boolean {
  const err = error as {
    message?: string;
    response?: {
      data?: Array<{ message?: string }>;
    };
  };

  const sdkMessage = err.message || '';
  const sfMessage = err.response?.data?.[0]?.message || '';
  const fullMessage = `${sdkMessage} ${sfMessage}`.toLowerCase();

  return (
    fullMessage.includes('requested resource does not exist') ||
    fullMessage.includes("sobject type 'contactshare' is not supported")
  );
}

export function accessLevelToRelation(level?: AccessLevel | null): ShareRelation | null {
  if (!level || level === 'None') {
    return null;
  }

  switch (level) {
    case 'Read':
      return 'viewer';
    case 'Edit':
      return 'editor';
    case 'All':
      return 'owner';
    default:
      return null;
  }
}
