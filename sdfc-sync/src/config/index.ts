export type { Config, OpenFGAConfig, SyncState } from './config.js';

export {
  loadConfig,
  saveConfig,
  validateConfig,
  isAuthenticated,
  isTokenExpired,
  saveTokens,
  clearTokens,
  getDefaultConfigPath,
  updateSyncTimestamp,
  clearSyncState,
} from './config.js';
