import { Command } from 'commander';
import chalk from 'chalk';
import {
  loadConfig,
  saveConfig,
  validateConfig,
  isAuthenticated,
  isTokenExpired,
  clearTokens,
} from '../config/index.js';
import { clientCredentialsAuth, revokeToken } from '../services/salesforce/auth.js';
import { SalesforceClient } from '../services/salesforce/client.js';

export function registerAuthCommands(program: Command): void {
  const auth = program.command('auth').description('Manage Salesforce authentication');

  auth
    .command('login')
    .description('Authenticate using Client Credentials flow')
    .action(async () => {
      const opts = program.opts();
      const config = loadConfig(opts.config as string | undefined);

      try {
        validateConfig(config);
      } catch (error) {
        console.error(chalk.red(`Invalid config: ${(error as Error).message}`));
        console.error(chalk.yellow('\nPlease configure your Connected App credentials.'));
        process.exit(1);
      }

      if (isAuthenticated(config) && !isTokenExpired(config)) {
        console.log(chalk.yellow('Already authenticated. Use "sdfc-sync-demo auth logout" to log out first.'));
        return;
      }

      console.log('Authenticating with Client Credentials flow...');

      try {
        const result = await clientCredentialsAuth(config, opts.debug as boolean);
        console.log(chalk.green('Successfully authenticated!'));
        console.log(`Instance: ${result.instanceUrl}`);
        console.log(`Token expires: ${config.tokenExpiry?.toISOString()}`);

        try {
          const sfClient = new SalesforceClient(config, opts.debug as boolean);
          const orgInfo = await sfClient.getOrganizationInfo();
          config.organizationId = orgInfo.Id as string;
          saveConfig(config, opts.config as string | undefined);
          console.log(`Organization ID: ${config.organizationId}`);
        } catch (orgError) {
          console.warn(chalk.yellow(`Warning: Could not fetch organization ID: ${(orgError as Error).message}`));
        }
      } catch (error) {
        console.error(chalk.red(`Authentication failed: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  auth
    .command('logout')
    .description('Revoke token and clear stored credentials')
    .action(async () => {
      const opts = program.opts();
      const config = loadConfig(opts.config as string | undefined);

      if (!isAuthenticated(config)) {
        console.log('Not currently authenticated.');
        return;
      }

      try {
        if (config.accessToken) {
          await revokeToken(config.instanceUrl, config.accessToken, opts.debug as boolean);
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: failed to revoke token: ${(error as Error).message}`));
      }

      clearTokens(config, opts.config as string | undefined);
      console.log(chalk.green('Successfully logged out.'));
    });

  auth
    .command('status')
    .description('Show authentication status')
    .action(() => {
      const opts = program.opts();
      const config = loadConfig(opts.config as string | undefined);

      if (!isAuthenticated(config)) {
        console.log(chalk.yellow('Status: Not authenticated'));
        console.log('\nRun "sdfc-sync-demo auth login" to authenticate.');
        return;
      }

      console.log(chalk.green('Status: Authenticated'));
      console.log(`Instance: ${config.instanceUrl}`);
      if (config.organizationId) {
        console.log(`Organization ID: ${config.organizationId}`);
      }

      if (!config.tokenExpiry) {
        console.log('Token expiry: Unknown');
      } else if (isTokenExpired(config)) {
        console.log(chalk.red(`Token expiry: ${config.tokenExpiry.toISOString()} (EXPIRED)`));
        console.log(chalk.yellow('\nYour token has expired. Run "sdfc-sync-demo auth login" to re-authenticate.'));
      } else {
        console.log(`Token expiry: ${config.tokenExpiry.toISOString()}`);
        const remaining = config.tokenExpiry.getTime() - Date.now();
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`Time remaining: ${hours}h ${minutes}m`);
      }
    });
}
