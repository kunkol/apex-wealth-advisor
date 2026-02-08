# sdfc-sync-demo

A standalone CLI that synchronizes selected Salesforce entities into OpenFGA tuples using the demo model in `openfga/salesforce-demo.fga`.

## How The CLI Works

### 1. What commands exist

The CLI command is `sdfc-sync-demo`, backed by the Node entrypoint `dist/cli.js` (from `package.json#bin`).
It is not a native compiled binary and requires Node.js (>= 18).

You can run it in three ways:
- Directly with Node after build: `node dist/cli.js <command>`
- In dev mode without building: `npm run dev -- <command>`
- As the command name `sdfc-sync-demo` after linking/installing the package (for local dev: `npm link`)

Available commands:
- `auth login`: authenticates to Salesforce with OAuth Client Credentials and stores tokens in config.
- `auth logout`: revokes token (best effort) and clears local auth fields.
- `auth status`: prints authentication and token expiry status.
- `sync`: runs Salesforce -> OpenFGA synchronization.

Global options:
- `-c, --config <path>`: override config file path.
- `-d, --debug`: enable debug logging.

`sync` options:
- `--dry-run`: compute fetch/translate/diff without writing/deleting tuples.
- `--full`: force full sync (ignore saved `last_sync_timestamp`).

### 2. Config file

Default config path:
- `./.credentials.yaml`

`.credentials.yaml` stores runtime state only.

Runtime fields written by the CLI:
```yaml
access_token: <token>
token_expiry: <iso_timestamp>
organization_id: <salesforce_org_id>
sync_state:
  last_sync_timestamp: <iso_timestamp>
```

Salesforce configuration is loaded from environment only:
- `SALESFORCE_CLIENT_ID`
- `SALESFORCE_CLIENT_SECRET`
- `SALESFORCE_INSTANCE_URL`

OpenFGA configuration is loaded from environment only:
- `FGA_API_URL`
- `FGA_STORE_ID`
- `FGA_MODEL_ID`

Optional OpenFGA client-credentials mode is also supported through:
- `FGA_CLIENT_ID`
- `FGA_CLIENT_SECRET`
- `FGA_API_TOKEN_ISSUER`
- `FGA_API_AUDIENCE`

### 3. Typical usage

1. Install dependencies:
```bash
npm install
```
2. Build:
```bash
npm run build
```
3. Authenticate:
```bash
node dist/cli.js auth login
```
4. Run a dry run:
```bash
node dist/cli.js sync --dry-run
```
5. Run real sync:
```bash
node dist/cli.js sync
```
6. Force full sync when needed:
```bash
node dist/cli.js sync --full
```

## Configuring a Salesforce Connected App

1. Go to **Setup** (top-right gear icon).
2. Search for **External Client Apps** and click **External Client App Manager**.
3. Click **New External Client App**.
4. Under **OAuth Settings**, click **Enable OAuth**.
5. Enter `http://localhost:8080/callback` as the callback URL (not used, but required).
6. In **Selected OAuth Scopes**, add:
   - "Manage user data via APIs (api)"
   - "Full access (full)"
7. Check **Enable Client Credentials Flow** and click **Create**.
8. Under **Policies**, click **Edit** and confirm **Enable Client Credentials Flow** is enabled.
9. Select an admin user for **Run As**.
10. Go to **Settings > OAuth Settings** and retrieve the **Consumer Key and Secret** (Salesforce may send an OTP to your email).
11. Copy the values into your `.env` file:

```bash
SALESFORCE_CLIENT_ID=<consumer_key>
SALESFORCE_CLIENT_SECRET=<consumer_secret>
SALESFORCE_INSTANCE_URL=https://orgfarm-2771b5c595-dev-ed.develop.my.salesforce.com
```

> `SALESFORCE_INSTANCE_URL` is the base URL of your Salesforce org (visible in the browser address bar).

12. Verify authentication:

```bash
node dist/cli.js auth login
```

Expected output:

```
Authenticating with Client Credentials flow...
Successfully authenticated!
Instance: https://orgfarm-2771b5c595-dev-ed.develop.my.salesforce.com
Token expires: 2026-02-07T22:24:05.304Z
Organization ID: 00Dfj00000FGhGiEAL
```

## Bootstrapping a Project With This Model

1. Create a store with the demo authorization model:

```bash
fga store create --model openfga/salesforce-demo.fga
```

Example output:

```json
{
  "store": {
    "created_at": "2026-02-07T17:59:40.052653Z",
    "id": "01KGWM4TRMMR82D1DA5TPR0CYX",
    "name": "salesforce-demo",
    "updated_at": "2026-02-07T17:59:40.052653Z"
  },
  "model": {
    "authorization_model_id": "01KGWM4TRWH9TRXXAXN4BVFND7"
  }
}
```

2. Restrict access to Government accounts:

```bash
fga tuple write "user:*" restricted industry:government --store-id <store_id>
```

Example output:

```json
{
  "successful": [
    {
      "object": "industry:government",
      "relation": "restricted",
      "user": "user:*"
    }
  ]
}
```


## How The Synchronization Works

### 1. Sync mode selection

At start, the sync command loads config and validates:
- Salesforce authentication is present and not expired.
- OpenFGA config exists (`api_url`, `store_id`).

Mode selection:
- Full sync if `--full` is used or no previous timestamp exists.
- Incremental sync otherwise, using `sync_state.last_sync_timestamp`.

### 2. Data fetched from Salesforce

Metadata (always full fetch):
- active users
- admin users
- roles
- public groups
- group members
- permission set assignments

Business records (full or incremental by `LastModifiedDate`):
- accounts
- contacts
- tasks

Sharing data:
- account shares (`RowCause IN ('Manual', 'Rule')`)
- contact shares (`ContactShare`, when available in the org/API)

Deleted records on incremental runs:
- `Account`, `Contact`, `Task` via Salesforce `getDeleted` API.

### 3. Translation into OpenFGA tuples

The translator maps Salesforce data to tuples for the demo model, including:
- organization membership/admin relations
- role hierarchy and role assignment
- group membership (user and nested group)
- permission set assignment
- account organization/owner/owner_role/industry
- contact organization/owner/parent_account
- task organization/owner/parent_record
- account share to `viewer`/`editor`/`owner`
- contact share to `viewer`/`editor`
- account share contact access (`ContactAccessLevel`) propagated to child contacts

### 4. Diff and apply

Tuple apply flow:
1. Build the new tuple set from fetched data.
2. Read existing tuples from OpenFGA.
3. Compute stale tuples for managed types not present in the new set.
4. Delete stale tuples.
5. Write new tuples (batched, 40 per write request).
6. For deleted Salesforce records, remove all tuples for those object IDs.
7. Save `sync_state.last_sync_timestamp`.

### 5. Safety and behavior notes

- `--dry-run` performs fetch/translate/diff but does not mutate OpenFGA or sync state.
- Sync is idempotent by design: repeated runs converge to the same tuple state.
- The sync scope is intentionally limited to the demo model entities.

## E2E Tests

E2E tests are under `tests/e2e`.

Run:
```bash
FGA_API_URL=http://localhost:8080 npm run test:e2e
```

Prerequisites:
- OpenFGA running and reachable.
- Salesforce auth available in config (`auth login` done).

Test suites cover:
- industry restriction behavior
- account permission paths (owner, role, group share, admin)
- re-sync and tuple cleanup after Salesforce changes
