import { runSync } from '../../src/commands/sync.js';
import { createIsolatedStore, cleanupStore, E2ETestHelper, TestConfig, shouldRunE2E } from './helpers.js';
import {
  SalesforceTestHelper,
  AccountShareRecord,
  ContactShareRecord,
  getSalesforceConfig,
  shouldRunFullE2E,
  getTestConfigPath,
} from './salesforce-helpers.js';
import { User } from '../../src/services/salesforce/users.js';
import { accessLevelToRelation } from '../../src/services/salesforce/index.js';

interface RoleRecord {
  Id: string;
  ParentRoleId?: string;
}

const runSuite = shouldRunE2E() && shouldRunFullE2E();

(runSuite ? describe : describe.skip)('E2E Suite 2: Account Permissions', () => {
  let sfHelper: SalesforceTestHelper;
  let fgaHelper: E2ETestHelper;
  let storeConfig: TestConfig;

  let ownerUser: User;
  let managerUser: User | undefined;
  let viewerShareUser: User | undefined;
  let groupMemberUser: User | undefined;
  let adminUser: User | undefined;
  let unrelatedUser: User | undefined;

  let accountId: string;
  let contactId: string;
  let groupId: string | undefined;
  let userShareId: string | undefined;
  let groupShareId: string | undefined;
  let sampledContactShare: ContactShareRecord | null = null;
  let userShareCreated = false;
  let groupShareCreated = false;
  let canAssertUnrelatedDenied = false;

  function isInOwnerRoleLineage(user: User, owner: User, roleMap: Map<string, RoleRecord>): boolean {
    if (!user.UserRoleId || !owner.UserRoleId) {
      return false;
    }

    let currentRoleId: string | undefined = owner.UserRoleId;
    while (currentRoleId) {
      if (user.UserRoleId === currentRoleId) {
        return true;
      }
      currentRoleId = roleMap.get(currentRoleId)?.ParentRoleId;
    }

    return false;
  }

  beforeAll(async () => {
    const sfConfig = getSalesforceConfig();
    if (!sfConfig) {
      throw new Error('Salesforce auth is required. Run "sdfc-sync-demo auth login" first.');
    }

    sfHelper = new SalesforceTestHelper(sfConfig);
    await sfHelper.cleanupStaleTestData();

    const { users, adminUsers } = await sfHelper.getTestUsers();
    if (users.length < 3) {
      throw new Error('Need at least 3 active Salesforce users for this suite.');
    }

    const roles = await sfHelper.getRoles();
    const roleMap = new Map<string, RoleRecord>(roles.map((r) => [r.Id, r]));

    ownerUser = users.find((u) => !!u.UserRoleId) ?? users[0];
    viewerShareUser = users.find((u) => u.Id !== ownerUser.Id);
    groupMemberUser = users.find((u) => u.Id !== ownerUser.Id && u.Id !== viewerShareUser?.Id);

    for (const candidate of users) {
      if (candidate.Id === ownerUser.Id) {
        continue;
      }
      if (isInOwnerRoleLineage(candidate, ownerUser, roleMap)) {
        managerUser = candidate;
        break;
      }
    }

    adminUser = adminUsers.find((u) => u.Id !== ownerUser.Id);

    unrelatedUser = users.find(
      (u) =>
        u.Id !== ownerUser.Id &&
        u.Id !== viewerShareUser?.Id &&
        u.Id !== groupMemberUser?.Id &&
        u.Id !== managerUser?.Id &&
        u.Id !== adminUser?.Id
    );

    if (unrelatedUser) {
      canAssertUnrelatedDenied =
        !isInOwnerRoleLineage(unrelatedUser, ownerUser, roleMap) && unrelatedUser.Id !== adminUser?.Id;
    }

    storeConfig = await createIsolatedStore();
    fgaHelper = new E2ETestHelper(storeConfig);

    process.env.FGA_API_URL = storeConfig.apiUrl;
    process.env.FGA_STORE_ID = storeConfig.storeId;
    if (storeConfig.authorizationModelId) {
      process.env.FGA_MODEL_ID = storeConfig.authorizationModelId;
    }

    accountId = await sfHelper.createTestAccount('Account_Permissions', ownerUser.Id, 'Healthcare');
    contactId = await sfHelper.createTestContact(accountId, ownerUser.Id);

    if (groupMemberUser) {
      try {
        groupId = await sfHelper.createPublicGroup('AccountEditors');
        await sfHelper.addGroupMember(groupId, groupMemberUser.Id);
      } catch {
        groupId = undefined;
      }
    }

    if (viewerShareUser) {
      try {
        userShareId = await sfHelper.createAccountShare(accountId, viewerShareUser.Id, 'Read');
        userShareCreated = true;
      } catch {
        userShareId = undefined;
        userShareCreated = false;
      }
    }

    if (groupId) {
      try {
        groupShareId = await sfHelper.createAccountShare(accountId, groupId, 'Edit');
        groupShareCreated = true;
      } catch {
        groupShareId = undefined;
        groupShareCreated = false;
      }
    }

    await runSync({
      configPath: getTestConfigPath(),
      full: true,
      debug: false,
    });

    sampledContactShare = await sfHelper.findAnyContactShare();
  }, 240000);

  afterAll(async () => {
    if (sfHelper) {
      await sfHelper.cleanup();
    }
    if (storeConfig) {
      await cleanupStore(storeConfig);
    }
    delete process.env.FGA_STORE_ID;
    delete process.env.FGA_MODEL_ID;
  }, 120000);

  it('owner can view/edit/delete account', async () => {
    expect(await fgaHelper.check(`user:${ownerUser.Id}`, 'can_view', `account:${accountId}`)).toBe(true);
    expect(await fgaHelper.check(`user:${ownerUser.Id}`, 'can_edit', `account:${accountId}`)).toBe(true);
    expect(await fgaHelper.check(`user:${ownerUser.Id}`, 'can_delete', `account:${accountId}`)).toBe(true);
  });

  it('user in parent role can view via owner_role relation', async () => {
    if (!managerUser) {
      // Skip when org data does not contain an accessible role hierarchy pair.
      return;
    }

    expect(await fgaHelper.check(`user:${managerUser.Id}`, 'can_view', `account:${accountId}`)).toBe(true);
  });

  it('manually shared user gets viewer access', async () => {
    if (!viewerShareUser || !userShareCreated) {
      // Skip when the org does not allow creating manual AccountShare rows.
      return;
    }

    expect(await fgaHelper.check(`user:${viewerShareUser.Id}`, 'can_view', `account:${accountId}`)).toBe(true);
  });

  it('group member gets editor access via group share', async () => {
    if (!groupMemberUser || !groupShareCreated) {
      // Skip when group setup or share creation is blocked in the org.
      return;
    }

    expect(await fgaHelper.check(`user:${groupMemberUser.Id}`, 'can_edit', `account:${accountId}`)).toBe(true);
  });

  it('syncs contact relation from AccountShare.ContactAccessLevel for directly shared users', async () => {
    if (!viewerShareUser || !userShareCreated || !userShareId) {
      // Skip when user share setup is unavailable in the org.
      return;
    }

    const share = await sfHelper.getAccountShareById(userShareId);
    if (!share) {
      return;
    }

    await assertExpectedContactShareTuple(
      share,
      `user:${viewerShareUser.Id}`,
      fgaHelper,
      contactId
    );
  });

  it('syncs contact relation from AccountShare.ContactAccessLevel for group shares', async () => {
    if (!groupId || !groupShareCreated || !groupShareId) {
      // Skip when group share setup is unavailable in the org.
      return;
    }

    const share = await sfHelper.getAccountShareById(groupShareId);
    if (!share) {
      return;
    }

    await assertExpectedContactShareTuple(share, `group:${groupId}#member`, fgaHelper, contactId);
  });

  it('syncs at least one existing ContactShare row when the org exposes them', async () => {
    if (!sampledContactShare) {
      // Skip when the org has no readable ContactShare rows.
      return;
    }

    const expectedRelation = accessLevelToRelation(sampledContactShare.ContactAccessLevel);
    if (!expectedRelation) {
      return;
    }

    const userRef = sampledContactShare.UserOrGroupId.startsWith('00G')
      ? `group:${sampledContactShare.UserOrGroupId}#member`
      : `user:${sampledContactShare.UserOrGroupId}`;

    const tuples = await fgaHelper.readTuples({
      user: userRef,
      object: `contact:${sampledContactShare.ContactId}`,
    });

    expect(tuples.some((tuple) => tuple.relation === expectedRelation)).toBe(true);
  });

  it('org admin can view/edit/delete through organization relation', async () => {
    if (!adminUser) {
      // Skip when no active System Administrator user is available.
      return;
    }

    expect(await fgaHelper.check(`user:${adminUser.Id}`, 'can_view', `account:${accountId}`)).toBe(true);
    expect(await fgaHelper.check(`user:${adminUser.Id}`, 'can_edit', `account:${accountId}`)).toBe(true);
    expect(await fgaHelper.check(`user:${adminUser.Id}`, 'can_delete', `account:${accountId}`)).toBe(true);
  });

  it('unrelated user is denied when they are outside role/share/admin paths', async () => {
    if (!unrelatedUser || !canAssertUnrelatedDenied) {
      // Skip when we cannot guarantee isolation from role hierarchy or admin grants.
      return;
    }

    expect(await fgaHelper.check(`user:${unrelatedUser.Id}`, 'can_view', `account:${accountId}`)).toBe(false);
    expect(await fgaHelper.check(`user:${unrelatedUser.Id}`, 'can_edit', `account:${accountId}`)).toBe(false);
    expect(await fgaHelper.check(`user:${unrelatedUser.Id}`, 'can_delete', `account:${accountId}`)).toBe(false);
  });
});

async function assertExpectedContactShareTuple(
  share: AccountShareRecord,
  userRef: string,
  fgaHelper: E2ETestHelper,
  contactId: string
): Promise<void> {
  const expectedRelation = accessLevelToRelation(share.ContactAccessLevel ?? 'None');
  const tuples = await fgaHelper.readTuples({
    user: userRef,
    object: `contact:${contactId}`,
  });

  const directRelations = tuples
    .filter((tuple) => tuple.relation === 'viewer' || tuple.relation === 'editor' || tuple.relation === 'owner')
    .map((tuple) => tuple.relation);

  if (!expectedRelation) {
    expect(directRelations.length).toBe(0);
    return;
  }

  expect(directRelations).toContain(expectedRelation);
}
