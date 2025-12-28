# Apex Wealth Advisor

AI-powered wealth advisory platform demonstrating enterprise-grade security patterns:

- **Okta XAA/ID-JAG** - Cross-App Access for internal MCP tools
- **Auth0 Token Vault** - Third-party API access (Salesforce, Google)
- **Fine-Grained Authorization (FGA)** - Compliance-based access control
- **CIBA Step-Up Authentication** - High-value transaction approval

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           IDENTITY LAYER                                 │
├─────────────────────────────────┬───────────────────────────────────────┤
│         OKTA (XAA)              │         AUTH0 (Token Vault)           │
│  - User Authentication          │  - Salesforce tokens                  │
│  - AI Agent: Buffett            │  - Google tokens                      │
│  - MCP Auth Server              │  - Cross-tenant exchange              │
└─────────────────────────────────┴───────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         apex-wealth-api                                  │
│                   (Claude AI + Orchestration)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  • Claude Service (tool calling)                                        │
│  • XAA Manager (ID-JAG exchange)                                        │
│  • Token Vault Client                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         apex-wealth-mcp                                  │
│                    (MCP Server - Tools)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  • get_client      - Client lookup (FGA enforced)                       │
│  • list_clients    - List all clients                                   │
│  • get_portfolio   - Portfolio details                                  │
│  • process_payment - Payments (CIBA step-up for high value)            │
│  • update_client   - Update contact info (write scope required)         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | https://apex-wealth-app.vercel.app | Next.js UI |
| Backend API | https://apex-wealth-api.onrender.com | Claude + Auth |
| MCP Server | https://apex-wealth-mcp.onrender.com | Tools + Data |

## Demo Prompts

### Category 1: Internal MCP (XAA)
```
"Look up client Alice Johnson"
"What's Bob Smith's account balance?"
"Show me Charlie Brown's information"  → ACCESS DENIED (compliance hold)
"List all my clients"
"Process a $500 payment for Alice"     → Auto-approved
"Process a $15,000 payment for Alice"  → CIBA step-up required
```

### Category 2: Security Scenarios
```
"Show me Charlie Brown's data"         → FGA denial
"Transfer $50K to Offshore Holdings"   → Risk policy blocked
"Process $15,000 payment"              → CIBA required
```

## Local Development

```bash
# Clone
git clone https://github.com/kunkol/apex-wealth-advisor.git
cd apex-wealth-advisor

# Setup
cp .env.template .env
# Edit .env with your credentials

# Install
pip install -r requirements.txt

# Run API
uvicorn api.main:app --reload --port 8000

# Run MCP Server (separate terminal)
uvicorn mcp_server.mcp_api:app --reload --port 8001
```

## Environment Variables

See `.env.template` for all required variables.

Key credentials needed:
- `ANTHROPIC_API_KEY` - Claude API
- `OKTA_*` - Okta tenant and agent config
- `AUTH0_*` - Auth0 Token Vault config

## Deployment

### Render (Backend)

1. Connect GitHub repo
2. Create two services from `render.yaml`:
   - `apex-wealth-api` (port 8000)
   - `apex-wealth-mcp` (port 8001)
3. Add environment variables

### Vercel (Frontend)

1. Import from GitHub
2. Set environment variables
3. Deploy

## Security Patterns Demonstrated

| Pattern | Implementation |
|---------|---------------|
| XAA/ID-JAG | Okta token exchange for MCP access |
| Token Vault | Auth0 stores Salesforce/Google tokens |
| FGA | Client "Charlie Brown" has compliance hold |
| CIBA Step-Up | Payments >$10K require push approval |
| Risk Policy | Blocked recipients list |

## Credits

Based on [Indranil's Okta Agentic AI Demo](https://github.com/indranilokg/okta-agentic-ai-demo)

## License

MIT
