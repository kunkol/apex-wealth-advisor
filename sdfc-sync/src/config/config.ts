import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import * as dotenv from 'dotenv';

export interface OpenFGAConfig {
  apiUrl?: string;
  storeId?: string;
  authorizationModelId?: string;
}

export interface SyncState {
  lastSyncTimestamp?: Date;
}

export interface Config {
  clientId: string;
  clientSecret: string;
  instanceUrl: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  organizationId?: string;
  openfga?: OpenFGAConfig;
  syncState?: SyncState;
}

interface RawConfig {
  access_token?: string;
  refresh_token?: string;
  token_expiry?: string;
  organization_id?: string;
  sync_state?: {
    last_sync_timestamp?: string;
  };
}

const DEFAULT_CONFIG_FILENAME = '.credentials.yaml';
const DEFAULT_ENV_FILENAME = '.env';
const FALLBACK_ENV_FILENAME = '.evn';

function loadDotEnv(configPath?: string): void {
  const candidateDirs: string[] = [process.cwd()];

  if (configPath) {
    const configDir = path.dirname(path.resolve(configPath));
    if (!candidateDirs.includes(configDir)) {
      candidateDirs.push(configDir);
    }
  }

  for (const dir of candidateDirs) {
    const envFiles = [DEFAULT_ENV_FILENAME, FALLBACK_ENV_FILENAME];
    for (const envFile of envFiles) {
      const envPath = path.join(dir, envFile);
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false, quiet: true });
      }
    }
  }
}

export function getDefaultConfigPath(): string {
  return path.join(process.cwd(), DEFAULT_CONFIG_FILENAME);
}

export function loadConfig(configPath?: string): Config {
  loadDotEnv(configPath);

  const filePath = configPath || getDefaultConfigPath();
  const raw: RawConfig = fs.existsSync(filePath)
    ? (yaml.parse(fs.readFileSync(filePath, 'utf-8')) as RawConfig)
    : {};

  // Salesforce and OpenFGA configuration is environment-only.
  const sfClientId = process.env.SALESFORCE_CLIENT_ID || '';
  const sfClientSecret = process.env.SALESFORCE_CLIENT_SECRET || '';
  const sfInstanceUrl = process.env.SALESFORCE_INSTANCE_URL || '';
  const fgaApiUrl = process.env.FGA_API_URL;
  const fgaStoreId = process.env.FGA_STORE_ID;
  const fgaModelId = process.env.FGA_MODEL_ID;

  return {
    clientId: sfClientId,
    clientSecret: sfClientSecret,
    instanceUrl: sfInstanceUrl,
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    tokenExpiry: raw.token_expiry ? new Date(raw.token_expiry) : undefined,
    organizationId: raw.organization_id,
    openfga:
      fgaApiUrl || fgaStoreId || fgaModelId
        ? {
            apiUrl: fgaApiUrl,
            storeId: fgaStoreId,
            authorizationModelId: fgaModelId,
          }
        : undefined,
    syncState: raw.sync_state?.last_sync_timestamp
      ? {
          lastSyncTimestamp: new Date(raw.sync_state.last_sync_timestamp),
        }
      : undefined,
  };
}

export function saveConfig(config: Config, configPath?: string): void {
  const filePath = configPath || getDefaultConfigPath();

  const raw: RawConfig = {
    access_token: config.accessToken,
    refresh_token: config.refreshToken,
    token_expiry: config.tokenExpiry?.toISOString(),
    organization_id: config.organizationId,
    sync_state: config.syncState?.lastSyncTimestamp
      ? {
          last_sync_timestamp: config.syncState.lastSyncTimestamp.toISOString(),
        }
      : undefined,
  };

  // Remove undefined values
  const cleanRaw = JSON.parse(JSON.stringify(raw)) as RawConfig;

  const yamlContent = yaml.stringify(cleanRaw);
  fs.writeFileSync(filePath, yamlContent, { mode: 0o600 });
}

export function validateConfig(config: Config): void {
  if (!config.clientId) {
    throw new Error('client_id or SALESFORCE_CLIENT_ID is required');
  }
  if (!config.clientSecret) {
    throw new Error('client_secret or SALESFORCE_CLIENT_SECRET is required');
  }
  if (!config.instanceUrl) {
    throw new Error('instance_url or SALESFORCE_INSTANCE_URL is required');
  }
}

export function isAuthenticated(config: Config): boolean {
  return !!config.accessToken;
}

export function isTokenExpired(config: Config): boolean {
  if (!config.tokenExpiry) {
    return true;
  }
  // Consider token expired 5 minutes before actual expiry
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return fiveMinutesFromNow > config.tokenExpiry;
}

export function saveTokens(
  config: Config,
  accessToken: string,
  refreshToken: string | undefined,
  expiry: Date,
  configPath?: string
): void {
  config.accessToken = accessToken;
  config.refreshToken = refreshToken;
  config.tokenExpiry = expiry;
  saveConfig(config, configPath);
}

export function clearTokens(config: Config, configPath?: string): void {
  config.accessToken = undefined;
  config.refreshToken = undefined;
  config.tokenExpiry = undefined;
  saveConfig(config, configPath);
}

export function updateSyncTimestamp(config: Config, timestamp: Date, configPath?: string): void {
  config.syncState = {
    ...config.syncState,
    lastSyncTimestamp: timestamp,
  };
  saveConfig(config, configPath);
}

export function clearSyncState(config: Config, configPath?: string): void {
  config.syncState = undefined;
  saveConfig(config, configPath);
}
