#!/usr/bin/env node

import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth.js';
import { registerSyncCommand } from './commands/sync.js';
import { setDebugEnabled } from './services/logger.js';

const program = new Command();

program
  .name('sdfc-sync-demo')
  .description('Salesforce to OpenFGA authorization sync demo CLI')
  .version('1.0.0')
  .option('-c, --config <path>', 'Path to credentials file (default: ./.credentials.yaml)')
  .option('-d, --debug', 'Enable debug output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.debug) {
      setDebugEnabled(true);
    }
  });

registerAuthCommands(program);
registerSyncCommand(program);

program.parse(process.argv);
