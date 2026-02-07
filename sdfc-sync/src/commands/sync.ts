import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, isAuthenticated, isTokenExpired, updateSyncTimestamp } from '../config/index.js';
import {
  SalesforceClient,
  fetchUsers,
  fetchAdminUsers,
  fetchRoles,
  fetchPublicGroups,
  fetchGroupMembers,
  fetchPermissionSetAssignments,
  fetchAccounts,
  fetchContacts,
  fetchTasks,
  RecordFetchOptions,
  RecordType,
  fetchDeletedRecords,
  fetchAccountShares,
  fetchContactShares,
} from '../services/salesforce/index.js';
import { FGAClient, translateAll, Tuple } from '../services/openfga/index.js';

interface SyncOptions {
  configPath?: string;
  debug?: boolean;
  dryRun?: boolean;
  full?: boolean;
}

export interface SyncResult {
  totalTuples: number;
  staleTuples: number;
  deletedRecordTupleCount: number;
  deletedRecords: number;
  mode: 'full' | 'incremental';
}

function tupleKey(tuple: Tuple): string {
  return `${tuple.user}|${tuple.relation}|${tuple.object}`;
}

async function findStaleTuples(fgaClient: FGAClient, newTuples: Tuple[]): Promise<Tuple[]> {
  const typesToDiff = [
    'organization:',
    'role:',
    'group:',
    'permission_set:',
    'account:',
    'contact:',
    'task:',
  ];

  const newTupleKeys = new Set(newTuples.map(tupleKey));
  const existingTuples = await fgaClient.readTuples();

  return existingTuples.filter((existing) => {
    const managesObject = typesToDiff.some((prefix) => existing.object.startsWith(prefix));
    const managesUser = typesToDiff.some((prefix) => existing.user.startsWith(prefix));
    if (!managesObject && !managesUser) {
      return false;
    }

    return !newTupleKeys.has(tupleKey(existing));
  });
}

export async function runSync(options: SyncOptions = {}): Promise<SyncResult> {
  const config = loadConfig(options.configPath);

  if (!isAuthenticated(config) || isTokenExpired(config)) {
    throw new Error('Not authenticated. Run "sdfc-sync-demo auth login" first.');
  }

  if (!config.openfga?.apiUrl || !config.openfga?.storeId) {
    throw new Error('OpenFGA configuration missing. Add openfga settings to your config.');
  }

  const syncStartTime = new Date();
  const sfClient = new SalesforceClient(config, options.debug ?? false);
  const fgaClient = new FGAClient(config.openfga, options.debug ?? false);

  const lastSyncTimestamp = config.syncState?.lastSyncTimestamp;
  const isFullSync = options.full || !lastSyncTimestamp;
  const recordFetchOptions: RecordFetchOptions = isFullSync ? {} : { sinceDate: lastSyncTimestamp };

  console.log(chalk.bold('\nStarting Salesforce to OpenFGA sync...'));
  console.log(chalk.gray(`  OpenFGA Store: ${config.openfga.storeId}`));
  console.log(
    chalk.gray(
      `  Mode: ${isFullSync ? (options.full ? 'Full sync (forced)' : 'Full sync (first run)') : `Incremental sync (since ${lastSyncTimestamp!.toISOString()})`}`
    )
  );

  const spinner = ora('Fetching users...').start();

  let deletedRecordTupleCount = 0;
  let deletedRecordCount = 0;

  try {
    const users = await fetchUsers(sfClient);
    spinner.text = `Fetched ${users.length} users`;

    const adminUsers = await fetchAdminUsers(sfClient);
    const adminUserIds = new Set(adminUsers.map((u) => u.Id));
    spinner.text = `Fetched ${adminUsers.length} admin users`;

    spinner.text = 'Fetching roles...';
    const roles = await fetchRoles(sfClient);
    spinner.text = `Fetched ${roles.length} roles`;

    spinner.text = 'Fetching public groups...';
    const groups = await fetchPublicGroups(sfClient);
    spinner.text = `Fetched ${groups.length} public groups`;

    spinner.text = 'Fetching group members...';
    const groupMembers = await fetchGroupMembers(sfClient);
    spinner.text = `Fetched ${groupMembers.length} group members`;

    spinner.text = 'Fetching permission set assignments...';
    const permSetAssignments = await fetchPermissionSetAssignments(sfClient);
    spinner.text = `Fetched ${permSetAssignments.length} permission set assignments`;

    const recordsLabel = isFullSync ? '' : ' (modified)';

    spinner.text = `Fetching accounts${recordsLabel}...`;
    const accounts = await fetchAccounts(sfClient, recordFetchOptions);
    spinner.text = `Fetched ${accounts.length} accounts${recordsLabel}`;

    spinner.text = `Fetching contacts${recordsLabel}...`;
    const contacts = await fetchContacts(sfClient, recordFetchOptions);
    spinner.text = `Fetched ${contacts.length} contacts${recordsLabel}`;

    spinner.text = `Fetching tasks${recordsLabel}...`;
    const tasks = await fetchTasks(sfClient, recordFetchOptions);
    spinner.text = `Fetched ${tasks.length} tasks${recordsLabel}`;

    spinner.text = 'Fetching account shares...';
    const accountShares = await fetchAccountShares(sfClient);
    spinner.text = `Fetched ${accountShares.length} account shares`;

    spinner.text = 'Fetching contact shares...';
    const contactShares = await fetchContactShares(sfClient);
    spinner.text = `Fetched ${contactShares.length} contact shares`;

    let deletedRecordIds: { id: string; type: RecordType }[] = [];
    if (!isFullSync) {
      spinner.text = 'Fetching deleted records...';
      const deletedRecords = await fetchDeletedRecords(sfClient, lastSyncTimestamp!, syncStartTime);
      deletedRecordIds = deletedRecords.map((r) => ({ id: r.id, type: r.type }));
      spinner.text = `Found ${deletedRecordIds.length} deleted records`;
      deletedRecordCount = deletedRecordIds.length;
    }

    spinner.succeed('Fetched all Salesforce data');

    const translateSpinner = ora('Translating to OpenFGA tuples...').start();
    const translationResult = translateAll({
      users,
      adminUserIds,
      roles,
      groups,
      groupMembers,
      permissionSetAssignments: permSetAssignments,
      accounts,
      contacts,
      tasks,
      accountShares,
      contactShares,
      industryRestrictions: [],
      orgId: config.organizationId,
    });
    translateSpinner.succeed(`Translated ${translationResult.tuples.length} tuples`);

    const staleSpinner = ora('Finding stale tuples...').start();
    const staleTuples = await findStaleTuples(fgaClient, translationResult.tuples);
    staleSpinner.succeed(`Found ${staleTuples.length} stale tuples`);

    if (options.dryRun) {
      console.log(chalk.yellow('\n[DRY RUN] No tuples were written to OpenFGA.'));
      return {
        totalTuples: translationResult.tuples.length,
        staleTuples: staleTuples.length,
        deletedRecordTupleCount,
        deletedRecords: deletedRecordCount,
        mode: isFullSync ? 'full' : 'incremental',
      };
    }

    if (staleTuples.length > 0) {
      const deleteStaleSpinner = ora('Removing stale tuples...').start();
      await fgaClient.deleteTuples(staleTuples);
      deleteStaleSpinner.succeed(`Removed ${staleTuples.length} stale tuples`);
    }

    const writeSpinner = ora('Writing tuples to OpenFGA...').start();
    await fgaClient.writeTuples(translationResult.tuples);
    writeSpinner.succeed(`Wrote ${translationResult.tuples.length} tuples`);

    if (deletedRecordIds.length > 0) {
      const deleteSpinner = ora('Deleting tuples for removed records...').start();
      for (const deleted of deletedRecordIds) {
        const objectId = `${deleted.type.toLowerCase()}:${deleted.id}`;
        const existingTuples = await fgaClient.readTuples({ object: objectId });
        if (existingTuples.length > 0) {
          await fgaClient.deleteTuples(existingTuples);
          deletedRecordTupleCount += existingTuples.length;
        }
      }
      deleteSpinner.succeed(`Deleted ${deletedRecordTupleCount} tuples for removed records`);
    }

    updateSyncTimestamp(config, syncStartTime, options.configPath);

    console.log(chalk.green('\n✓ Sync completed successfully!'));

    return {
      totalTuples: translationResult.tuples.length,
      staleTuples: staleTuples.length,
      deletedRecordTupleCount,
      deletedRecords: deletedRecordCount,
      mode: isFullSync ? 'full' : 'incremental',
    };
  } catch (error) {
    spinner.fail(`Error: ${(error as Error).message}`);
    throw error;
  }
}

export function registerSyncCommand(program: Command): void {
  program
    .command('sync')
    .description('Sync Salesforce demo data to OpenFGA')
    .option('--dry-run', 'Show what would be synced without writing')
    .option('--full', 'Force full sync (ignore last sync timestamp)')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      try {
        await runSync({
          configPath: opts.config as string | undefined,
          debug: opts.debug as boolean,
          dryRun: cmdOpts.dryRun as boolean,
          full: cmdOpts.full as boolean,
        });
      } catch (error) {
        console.error(chalk.red(`\nSync failed: ${(error as Error).message}`));
        process.exit(1);
      }
    });
}
