import { OpenFgaClient, CredentialsMethod } from '@openfga/sdk';
import { transformer } from '@openfga/syntax-transformer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODEL_FILE_PATH = path.join(__dirname, '../../openfga/salesforce-demo.fga');

export interface TestConfig {
  apiUrl: string;
  storeId: string;
  authorizationModelId?: string;
}

export interface Tuple {
  user: string;
  relation: string;
  object: string;
}

export class E2ETestHelper {
  private client: OpenFgaClient;

  constructor(config: TestConfig) {
    this.client = new OpenFgaClient({
      apiUrl: config.apiUrl,
      storeId: config.storeId,
      authorizationModelId: config.authorizationModelId,
      credentials: { method: CredentialsMethod.None },
    });
  }

  async writeTuples(tuples: Tuple[]): Promise<void> {
    if (tuples.length === 0) {
      return;
    }

    for (const tuple of tuples) {
      try {
        await this.client.write({
          writes: [{ user: tuple.user, relation: tuple.relation, object: tuple.object }],
        });
      } catch {
        // Ignore duplicate/validation errors in tests where data may already exist.
      }
    }
  }

  async deleteTuples(tuples: Tuple[]): Promise<void> {
    if (tuples.length === 0) {
      return;
    }

    await this.client.write({
      deletes: tuples.map((t) => ({ user: t.user, relation: t.relation, object: t.object })),
    });
  }

  async check(user: string, relation: string, object: string): Promise<boolean> {
    const response = await this.client.check({ user, relation, object });
    return response.allowed ?? false;
  }

  async readTuples(filter: { object?: string; user?: string; relation?: string }): Promise<Tuple[]> {
    const tuples: Tuple[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.read(
        {
          object: filter.object,
          user: filter.user,
          relation: filter.relation,
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

    return tuples;
  }
}

export async function createIsolatedStore(apiUrl = process.env.FGA_API_URL || 'http://localhost:8080'): Promise<TestConfig> {
  const client = new OpenFgaClient({
    apiUrl,
    credentials: { method: CredentialsMethod.None },
  });

  const storeResponse = await client.createStore({
    name: `sdfc-sync-demo-e2e-${Date.now()}`,
  });

  const storeId = storeResponse.id;
  if (!storeId) {
    throw new Error('OpenFGA store creation returned no store ID');
  }

  const modelDsl = fs.readFileSync(MODEL_FILE_PATH, 'utf-8');
  const modelJson = transformer.transformDSLToJSONObject(modelDsl);

  const storeClient = new OpenFgaClient({
    apiUrl,
    storeId,
    credentials: { method: CredentialsMethod.None },
  });

  const modelResponse = await storeClient.writeAuthorizationModel(modelJson);

  return {
    apiUrl,
    storeId,
    authorizationModelId: modelResponse.authorization_model_id,
  };
}

export async function cleanupStore(config: TestConfig): Promise<void> {
  const client = new OpenFgaClient({
    apiUrl: config.apiUrl,
    storeId: config.storeId,
    credentials: { method: CredentialsMethod.None },
  });

  await client.deleteStore();
}

export function shouldRunE2E(): boolean {
  return process.env.E2E_TEST === 'true';
}
