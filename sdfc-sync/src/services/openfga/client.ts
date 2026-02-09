import { OpenFgaClient, CredentialsMethod } from '@openfga/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { OpenFGAConfig } from '../../config/index.js';
import { debug } from '../logger.js';

const COMPONENT = 'openfga:client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type CredentialsConfig =
  | { method: CredentialsMethod.None }
  | {
      method: CredentialsMethod.ClientCredentials;
      config: {
        clientId: string;
        clientSecret: string;
        apiTokenIssuer: string;
        apiAudience: string;
      };
    };

/**
 * Get OpenFGA credentials configuration based on environment variables.
 * If FGA_CLIENT_ID is set, uses client credentials authentication.
 * Otherwise, uses no authentication.
 */
function getCredentialsConfig(): CredentialsConfig {
  const clientId = process.env.FGA_CLIENT_ID;

  if (clientId) {
    const clientSecret = process.env.FGA_CLIENT_SECRET;
    const apiTokenIssuer = process.env.FGA_API_TOKEN_ISSUER;
    const apiAudience = process.env.FGA_API_AUDIENCE;

    if (!clientSecret) {
      throw new Error('FGA_CLIENT_SECRET is required when FGA_CLIENT_ID is set');
    }
    if (!apiTokenIssuer) {
      throw new Error('FGA_API_TOKEN_ISSUER is required when FGA_CLIENT_ID is set');
    }
    if (!apiAudience) {
      throw new Error('FGA_API_AUDIENCE is required when FGA_CLIENT_ID is set');
    }

    return {
      method: CredentialsMethod.ClientCredentials,
      config: {
        clientId,
        clientSecret,
        apiTokenIssuer,
        apiAudience,
      },
    };
  }

  return {
    method: CredentialsMethod.None,
  };
}

export interface Tuple {
  user: string;
  relation: string;
  object: string;
}

export interface TupleKey {
  user: string;
  relation: string;
  object: string;
}

export interface CheckResult {
  allowed: boolean;
}

export interface ListObjectsResult {
  objects: string[];
}

export interface ListUsersResult {
  users: Array<{ object: { type: string; id: string } }>;
}

export class FGAClient {
  private client: OpenFgaClient;
  private apiUrl: string;
  private storeId: string;
  private authorizationModelId?: string;
  private debugMode: boolean;

  constructor(config: OpenFGAConfig, debugMode: boolean = false) {
    if (!config.apiUrl) {
      throw new Error('OpenFGA API URL is required');
    }
    if (!config.storeId) {
      throw new Error('OpenFGA Store ID is required');
    }

    this.apiUrl = config.apiUrl;
    this.storeId = config.storeId;
    this.authorizationModelId = config.authorizationModelId;
    this.debugMode = debugMode;

    const credentials = getCredentialsConfig();
    this.client = new OpenFgaClient({
      apiUrl: config.apiUrl,
      storeId: config.storeId,
      authorizationModelId: config.authorizationModelId,
      credentials,
    });

    if (debugMode) {
      const authMethod = credentials.method === CredentialsMethod.ClientCredentials
        ? 'client credentials'
        : 'no auth';
      debug(COMPONENT, `Initialized OpenFGA client: ${config.apiUrl}, store: ${config.storeId}, auth: ${authMethod}`);
    }
  }

  async createStore(name: string): Promise<string> {
    if (this.debugMode) {
      debug(COMPONENT, `Creating store: ${name}`);
    }

    const response = await this.client.createStore({ name });
    const newStoreId = response.id;

    if (this.debugMode) {
      debug(COMPONENT, `Store created: ${newStoreId}`);
    }

    return newStoreId ?? '';
  }

  async getStore(): Promise<{ id: string; name: string } | null> {
    try {
      const response = await this.client.getStore();
      return { id: response.id ?? '', name: response.name ?? '' };
    } catch {
      return null;
    }
  }

  async writeAuthorizationModel(_modelDsl: string): Promise<string> {
    if (this.debugMode) {
      debug(COMPONENT, 'Writing authorization model');
    }

    // The SDK expects the model in JSON format, but we have DSL
    // We need to transform DSL to JSON using the OpenFGA CLI or API
    // For now, we'll assume the model is already in the store
    // and return the current model ID

    const response = await this.client.readAuthorizationModels();
    if (response.authorization_models && response.authorization_models.length > 0) {
      const latestModel = response.authorization_models[0];
      this.authorizationModelId = latestModel.id;
      return latestModel.id ?? '';
    }

    throw new Error('No authorization model found. Please create one using the OpenFGA CLI.');
  }

  async getLatestAuthorizationModelId(): Promise<string | undefined> {
    const response = await this.client.readAuthorizationModels();
    if (response.authorization_models && response.authorization_models.length > 0) {
      return response.authorization_models[0].id;
    }
    return undefined;
  }

  async writeTuples(tuples: Tuple[], skipExisting: boolean = true): Promise<void> {
    if (tuples.length === 0) {
      return;
    }

    if (this.debugMode) {
      debug(COMPONENT, `Writing ${tuples.length} tuples to store ${this.storeId}`);
    }

    // OpenFGA API has a limit on batch size
    const batchSize = 40;
    let skippedCount = 0;

    for (let i = 0; i < tuples.length; i += batchSize) {
      const batch = tuples.slice(i, i + batchSize);

      try {
        await this.client.write({
          writes: batch.map((t) => ({
            user: t.user,
            relation: t.relation,
            object: t.object,
          })),
        });

        if (this.debugMode) {
          debug(COMPONENT, `Wrote batch ${Math.floor(i / batchSize) + 1} (${batch.length} tuples)`);
        }
      } catch (error) {
        // If batch fails and skipExisting is enabled, try writing one by one
        if (skipExisting && this.isDuplicateTupleError(error)) {
          if (this.debugMode) {
            debug(COMPONENT, `Batch ${Math.floor(i / batchSize) + 1} has duplicates, writing individually...`);
          }
          const batchSkipped = await this.writeTuplesIndividually(batch);
          skippedCount += batchSkipped;
        } else {
          throw error;
        }
      }
    }

    if (skippedCount > 0 && this.debugMode) {
      debug(COMPONENT, `Skipped ${skippedCount} existing tuples`);
    }
  }

  private isDuplicateTupleError(error: unknown): boolean {
    const message = (error as Error)?.message || '';
    return message.includes('tuple to be written already existed') ||
           message.includes('cannot write a tuple which already exists');
  }

  private async writeTuplesIndividually(tuples: Tuple[]): Promise<number> {
    let skipped = 0;
    for (const tuple of tuples) {
      try {
        await this.client.write({
          writes: [{
            user: tuple.user,
            relation: tuple.relation,
            object: tuple.object,
          }],
        });
      } catch (error) {
        if (this.isDuplicateTupleError(error)) {
          skipped++;
        } else {
          throw error;
        }
      }
    }
    return skipped;
  }

  async deleteTuples(tuples: Tuple[]): Promise<void> {
    if (tuples.length === 0) {
      return;
    }

    if (this.debugMode) {
      debug(COMPONENT, `Deleting ${tuples.length} tuples`);
    }

    const batchSize = 40;
    for (let i = 0; i < tuples.length; i += batchSize) {
      const batch = tuples.slice(i, i + batchSize);

      await this.client.write({
        deletes: batch.map((t) => ({
          user: t.user,
          relation: t.relation,
          object: t.object,
        })),
      });

      if (this.debugMode) {
        debug(COMPONENT, `Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} tuples)`);
      }
    }
  }

  async readTuples(filter?: { user?: string; relation?: string; object?: string }): Promise<Tuple[]> {
    if (this.debugMode) {
      debug(COMPONENT, `Reading tuples from store ${this.storeId} with filter: ${JSON.stringify(filter)}`);
    }

    const tuples: Tuple[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.read(
        {
          user: filter?.user,
          relation: filter?.relation,
          object: filter?.object,
        },
        { continuationToken }
      );

      if (response.tuples) {
        for (const tuple of response.tuples) {
          if (tuple.key) {
            tuples.push({
              user: tuple.key.user ?? '',
              relation: tuple.key.relation ?? '',
              object: tuple.key.object ?? '',
            });
          }
        }
      }

      continuationToken = response.continuation_token;
    } while (continuationToken);

    if (this.debugMode) {
      debug(COMPONENT, `Read ${tuples.length} tuples`);
    }

    return tuples;
  }

  async check(user: string, relation: string, object: string): Promise<boolean> {
    if (this.debugMode) {
      debug(COMPONENT, `Checking: ${user} ${relation} ${object}`);
    }

    const response = await this.client.check({
      user,
      relation,
      object,
    });

    const allowed = response.allowed ?? false;

    if (this.debugMode) {
      debug(COMPONENT, `Check result: ${allowed}`);
    }

    return allowed;
  }

  async listObjects(user: string, relation: string, type: string): Promise<string[]> {
    if (this.debugMode) {
      debug(COMPONENT, `Listing objects: user=${user}, relation=${relation}, type=${type}`);
    }

    const response = await this.client.listObjects({
      user,
      relation,
      type,
    });

    const objects = response.objects ?? [];

    if (this.debugMode) {
      debug(COMPONENT, `Found ${objects.length} objects`);
    }

    return objects;
  }

  async listUsers(
    relation: string,
    object: string,
    userType: string
  ): Promise<Array<{ type: string; id: string }>> {
    if (this.debugMode) {
      debug(COMPONENT, `Listing users: relation=${relation}, object=${object}, userType=${userType}`);
    }

    const response = await this.client.listUsers({
      relation,
      object: {
        type: object.split(':')[0],
        id: object.split(':')[1],
      },
      user_filters: [{ type: userType }],
    });

    const users =
      response.users?.map((u) => ({
        type: u.object?.type ?? '',
        id: u.object?.id ?? '',
      })) ?? [];

    if (this.debugMode) {
      debug(COMPONENT, `Found ${users.length} users`);
    }

    return users;
  }

  getStoreId(): string {
    return this.storeId;
  }

  getAuthorizationModelId(): string | undefined {
    return this.authorizationModelId;
  }

  async setAuthorizationModelId(modelId: string): Promise<void> {
    this.authorizationModelId = modelId;
    // Recreate the client with the new model ID
    this.client = new OpenFgaClient({
      apiUrl: this.apiUrl,
      storeId: this.storeId,
      authorizationModelId: modelId,
      credentials: getCredentialsConfig(),
    });
  }
}

export function loadModelDsl(): string {
  const modelPath = path.join(__dirname, '../../../openfga/salesforce-demo.fga');
  return fs.readFileSync(modelPath, 'utf-8');
}
