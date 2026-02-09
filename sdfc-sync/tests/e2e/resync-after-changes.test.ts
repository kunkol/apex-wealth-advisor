import { runSync } from '../../src/commands/sync.js';
import { createIsolatedStore, cleanupStore, E2ETestHelper, TestConfig, shouldRunE2E } from './helpers.js';
import { SalesforceTestHelper, getSalesforceConfig, shouldRunFullE2E, getTestConfigPath } from './salesforce-helpers.js';
import { User } from '../../src/services/salesforce/users.js';

const runSuite = shouldRunE2E() && shouldRunFullE2E();

(runSuite ? describe : describe.skip)('E2E Suite 3: Re-sync After Changes', () => {
  let sfHelper: SalesforceTestHelper;
  let fgaHelper: E2ETestHelper;
  let storeConfig: TestConfig;

  let oldOwner: User;
  let newOwner: User;
  let sharedUser: User | undefined;

  let accountId: string;
  let taskId: string;
  let shareId: string | undefined;
  let canAssertOldOwnerDenied = false;

  beforeAll(async () => {
    const sfConfig = getSalesforceConfig();
    if (!sfConfig) {
      throw new Error('Salesforce auth is required. Run "sdfc-sync-demo auth login" first.');
    }

    sfHelper = new SalesforceTestHelper(sfConfig);
    await sfHelper.cleanupStaleTestData();

    const { users } = await sfHelper.getTestUsers();
    if (users.length < 3) {
      throw new Error('Need at least 3 active Salesforce users for this suite.');
    }

    const adminUserIds = new Set((await sfHelper.getTestUsers()).adminUsers.map((u) => u.Id));

    oldOwner = users.find((u) => !adminUserIds.has(u.Id)) ?? users[0];
    newOwner = users.find((u) => u.Id !== oldOwner.Id) ?? users[1];
    sharedUser = users.find((u) => u.Id !== oldOwner.Id && u.Id !== newOwner.Id);

    // Assert negative access only when role/admin inheritance cannot still grant access.
    canAssertOldOwnerDenied = !oldOwner.UserRoleId && !adminUserIds.has(oldOwner.Id);

    storeConfig = await createIsolatedStore();
    fgaHelper = new E2ETestHelper(storeConfig);

    process.env.FGA_API_URL = storeConfig.apiUrl;
    process.env.FGA_STORE_ID = storeConfig.storeId;
    if (storeConfig.authorizationModelId) {
      process.env.FGA_MODEL_ID = storeConfig.authorizationModelId;
    }

    accountId = await sfHelper.createTestAccount('Resync_Account', oldOwner.Id, 'Healthcare');
    taskId = await sfHelper.createTestTask(accountId, oldOwner.Id);

    if (sharedUser) {
      try {
        shareId = await sfHelper.createAccountShare(accountId, sharedUser.Id, 'Read');
      } catch {
        shareId = undefined;
      }
    }

    // Initial full sync.
    await runSync({
      configPath: getTestConfigPath(),
      full: true,
      debug: false,
    });

    // Modify Salesforce data.
    await sfHelper.changeAccountOwner(accountId, newOwner.Id);

    if (shareId) {
      await sfHelper.deleteAccountShare(shareId);
      shareId = undefined;
    }

    await sfHelper.deleteRecord('Task', taskId);

    // Incremental re-sync on same OpenFGA store.
    await runSync({
      configPath: getTestConfigPath(),
      debug: false,
    });
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

  it('new owner has access after ownership change', async () => {
    expect(await fgaHelper.check(`user:${newOwner.Id}`, 'can_view', `account:${accountId}`)).toBe(true);
  });

  it('old owner owner-tuple is removed from OpenFGA', async () => {
    const oldOwnerTuples = await fgaHelper.readTuples({
      user: `user:${oldOwner.Id}`,
      relation: 'owner',
      object: `account:${accountId}`,
    });

    expect(oldOwnerTuples.length).toBe(0);
  });

  it('removed share no longer grants access', async () => {
    if (!sharedUser) {
      // Skip when there is no third user to test share removal.
      return;
    }

    expect(await fgaHelper.check(`user:${sharedUser.Id}`, 'can_view', `account:${accountId}`)).toBe(false);
  });

  it('deleted task tuples are removed from OpenFGA', async () => {
    const taskTuples = await fgaHelper.readTuples({ object: `task:${taskId}` });
    expect(taskTuples.length).toBe(0);
  });

  it('old owner loses view access when role inheritance cannot apply', async () => {
    if (!canAssertOldOwnerDenied) {
      // Skip when role hierarchy may still grant access.
      return;
    }

    expect(await fgaHelper.check(`user:${oldOwner.Id}`, 'can_view', `account:${accountId}`)).toBe(false);
  });
});
