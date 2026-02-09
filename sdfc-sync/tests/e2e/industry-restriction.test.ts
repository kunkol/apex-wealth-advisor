import { runSync } from '../../src/commands/sync.js';
import { createIsolatedStore, cleanupStore, E2ETestHelper, TestConfig, shouldRunE2E } from './helpers.js';
import { SalesforceTestHelper, getSalesforceConfig, shouldRunFullE2E, getTestConfigPath } from './salesforce-helpers.js';

const runSuite = shouldRunE2E() && shouldRunFullE2E();

(runSuite ? describe : describe.skip)('E2E Suite 1: Industry Restriction', () => {
  let sfHelper: SalesforceTestHelper;
  let fgaHelper: E2ETestHelper;
  let storeConfig: TestConfig;

  let ownerId: string;
  let restrictedAccountId: string;
  let allowedAccountId: string;

  beforeAll(async () => {
    const sfConfig = getSalesforceConfig();
    if (!sfConfig) {
      throw new Error('Salesforce auth is required. Run "sdfc-sync-demo auth login" first.');
    }

    sfHelper = new SalesforceTestHelper(sfConfig);
    await sfHelper.cleanupStaleTestData();

    const { users } = await sfHelper.getTestUsers();
    if (users.length === 0) {
      throw new Error('No active Salesforce users found for testing.');
    }

    ownerId = users[0].Id;
    storeConfig = await createIsolatedStore();
    fgaHelper = new E2ETestHelper(storeConfig);

    process.env.FGA_API_URL = storeConfig.apiUrl;
    process.env.FGA_STORE_ID = storeConfig.storeId;
    if (storeConfig.authorizationModelId) {
      process.env.FGA_MODEL_ID = storeConfig.authorizationModelId;
    }

    restrictedAccountId = await sfHelper.createTestAccount('Industry_Government', ownerId, 'Government');
    allowedAccountId = await sfHelper.createTestAccount('Industry_Healthcare', ownerId, 'Healthcare');

    await fgaHelper.writeTuples([
      {
        user: 'user:*',
        relation: 'restricted',
        object: 'industry:government',
      },
    ]);

    await runSync({
      configPath: getTestConfigPath(),
      full: true,
      debug: false,
    });
  }, 180000);

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

  it('blocks can_view for Government accounts with the wildcard restriction tuple', async () => {
    const canViewRestricted = await fgaHelper.check(
      `user:${ownerId}`,
      'can_view',
      `account:${restrictedAccountId}`
    );

    expect(canViewRestricted).toBe(false);
  });

  it('allows a valid owner to view non-restricted industry account', async () => {
    const canViewAllowed = await fgaHelper.check(
      `user:${ownerId}`,
      'can_view',
      `account:${allowedAccountId}`
    );

    expect(canViewAllowed).toBe(true);
  });
});
