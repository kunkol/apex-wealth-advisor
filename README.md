# 🏦 Apex Wealth Advisor

**AI-Powered Wealth Advisory Platform with Enterprise-Grade Agent Security**

A demonstration of secure AI agent architecture using Okta Cross-App Access (XAA), Auth0 Token Vault, and human-in-the-loop governance patterns.

![Demo Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Tests](https://img.shields.io/badge/Tests-24%2F24%20Passing-brightgreen)
![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-blue)

---

## 🎯 What This Demo Shows

| Capability | Implementation | Why It Matters |
|------------|----------------|----------------|
| **Agent Identity** | Okta XAA with ID-JAG tokens | Agents get identity, not just API keys |
| **Credential Security** | Auth0 Token Vault | Zero stored secrets in application |
| **Multi-System Access** | MCP + Salesforce + Google Calendar | Single prompt orchestrates multiple systems |
| **Human-in-the-Loop** | CIBA step-up authentication | Policy-driven human approval for sensitive actions |
| **Natural Language Routing** | Claude AI with tool descriptions | Agent auto-selects tools without explicit routing |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APEX WEALTH ADVISOR                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────┐      ┌─────────────┐      ┌─────────────────────────────┐    │
│   │  User   │──────│   Vercel    │──────│        Render API           │    │
│   │ Browser │      │  Frontend   │      │    (Python/FastAPI)         │    │
│   └─────────┘      └─────────────┘      └──────────────┬──────────────┘    │
│                                                        │                    │
│                    ┌───────────────────────────────────┼────────────────┐   │
│                    │                                   │                │   │
│            ┌───────▼───────┐    ┌─────────────────────▼────────────┐   │   │
│            │   Okta XAA    │    │        Auth0 Token Vault         │   │   │
│            │  (ID-JAG +    │    │    (Salesforce + Google tokens)  │   │   │
│            │ Token Exchange)│    └─────────────┬───────────────────┘   │   │
│            └───────┬───────┘                  │                        │   │
│                    │                          │                        │   │
│            ┌───────▼───────┐    ┌─────────────▼───────┐  ┌───────────▼─┐  │
│            │  Internal MCP │    │     Salesforce      │  │   Google    │  │
│            │    Server     │    │        CRM          │  │  Calendar   │  │
│            │  (5 tools)    │    │     (9 tools)       │  │  (5 tools)  │  │
│            └───────────────┘    └─────────────────────┘  └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Flows

### Flow 1: Okta Cross-App Access (XAA) — Internal MCP Server

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │    │  Okta    │    │  ID-JAG  │    │   MCP    │    │ Internal │
│ ID Token │───▶│  Token   │───▶│  Token   │───▶│  Access  │───▶│   MCP    │
│          │    │ Exchange │    │          │    │  Token   │    │  Server  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │
                              Agent Identity
                              Claims Embedded
```

**Key Points:**
- RFC 8693 token exchange for secure service-to-service auth
- ID-JAG token carries agent identity claims
- MCP token scoped to `mcp:read` and `mcp:write`
- Short-lived tokens (5 min ID-JAG, 1 hour MCP)

### Flow 2: Auth0 Token Vault — External Services

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Okta    │    │  Vault   │    │ Salesforce│   │  Google  │    │ External │
│  Token   │───▶│  Access  │───▶│  Token   │───▶│  Token   │───▶│   APIs   │
│          │    │  Token   │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │
              No Credentials
              Stored in App
```

**Key Points:**
- Credentials retrieved on-demand, never persisted
- Scoped tokens per service (Salesforce CRM, Google Calendar)
- Token Vault manages refresh automatically
- Audit trail for all credential access

### Flow 3: CIBA Step-Up — Human-in-the-Loop

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Agent   │    │  Policy  │    │   CIBA   │    │   Push   │    │  Human   │
│ Request  │───▶│  Check   │───▶│  Auth    │───▶│  Notif   │───▶│ Approval │
│ ($15K)   │    │ (>$10K)  │    │ Request  │    │ to Phone │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │
              Threshold-Based
              Policy Evaluation
```

**Key Points:**
- OpenID CIBA (Client-Initiated Backchannel Authentication)
- Configurable thresholds trigger human approval
- Transaction pending until explicit approval
- Full audit trail of approval decisions

---

## 🛠️ Tools Available (19 Total)

### Internal MCP Server (5 tools) — via Okta XAA
| Tool | Description |
|------|-------------|
| `get_client` | Get client profile and portfolio summary |
| `list_clients` | List all clients with AUM and risk profiles |
| `get_portfolio` | Get detailed portfolio holdings and allocation |
| `process_payment` | Process transfers (HITL for >$10K) |
| `get_market_data` | Get market indices and performance |

### Salesforce CRM (9 tools) — via Token Vault
| Tool | Description |
|------|-------------|
| `search_salesforce_contacts` | Search CRM contacts |
| `get_contact_opportunities` | Get opportunities for a contact |
| `get_sales_pipeline` | Pipeline summary by stage |
| `get_pipeline_value` | Total open pipeline value |
| `get_high_value_accounts` | Opportunities over $100K |
| `create_salesforce_task` | Create follow-up tasks |
| `create_salesforce_note` | Add notes to accounts |
| `create_salesforce_contact` | Create new contacts |
| `update_opportunity_stage` | Update opportunity stages |

### Google Calendar (5 tools) — via Token Vault
| Tool | Description |
|------|-------------|
| `list_calendar_events` | List upcoming meetings |
| `create_calendar_event` | Schedule new meetings |
| `cancel_calendar_event` | Cancel existing meetings |
| `get_calendar_event` | Get event details |
| `update_calendar_event` | Modify existing events |

---

## 🔄 Sequence Diagrams

### Flow 1: Okta Cross-App Access (XAA) — Internal MCP

```mermaid
sequenceDiagram
    participant User
    participant Agent as Apex AI Agent
    participant Okta
    participant MCP as Internal MCP Server

    User->>Agent: 1. Access Apex Wealth
    Agent->>Okta: 2. Redirect to Okta SSO
    Okta->>Okta: 3. User authenticates (MFA)
    Okta->>Agent: 4. ID Token (user: alice@acme.com)
    
    Note over Agent: User authenticated to Apex
    
    Agent->>Okta: 5. Token Exchange Request
    Note right of Okta: Grant: urn:ietf:params:oauth:grant-type:token-exchange<br/>Resource: apex-wealth-mcp<br/>Scope: mcp:read mcp:write
    Okta->>Okta: 6. Policy: Can alice use Apex Agent for MCP?
    Okta->>Agent: 7. ID-JAG Token (5 min TTL)
    Agent->>Okta: 8. JWT Bearer Grant with ID-JAG
    Okta->>Agent: 9. MCP Access Token (1 hour TTL)
    
    loop Secure API Calls
        Agent->>MCP: 10. get_portfolio(client="Marcus Thompson")
        MCP->>MCP: 11. Validate token + extract user context
        MCP->>Agent: 12. Portfolio data (scoped to user)
    end
```

### Flow 2: Auth0 Token Vault — External Services

```mermaid
sequenceDiagram
    participant Agent as Apex AI Agent
    participant Auth0 as Auth0 Token Vault
    participant SF as Salesforce API
    participant GCal as Google Calendar API

    Note over Agent,GCal: Step 1: Okta Token → Vault Token
    Agent->>Auth0: 1. Token Exchange Request
    Note right of Auth0: grant_type: token-exchange<br/>subject_token: okta_access_token<br/>audience: vault API
    Auth0->>Auth0: 2. Validate Okta token + lookup user
    Auth0->>Agent: 3. Vault Access Token
    
    Note over Agent,GCal: Step 2: Vault Token → SaaS Tokens (Parallel)
    
    par Salesforce Branch
        Agent->>Auth0: 4a. Request Salesforce token
        Note right of Auth0: connection: salesforce
        Auth0->>Agent: 5a. Salesforce Access Token
        Agent->>SF: 6a. Query CRM data
        SF->>Agent: 7a. Contacts, Opportunities
    and Google Branch
        Agent->>Auth0: 4b. Request Google token
        Note right of Auth0: connection: google-oauth2
        Auth0->>Agent: 5b. Google Access Token
        Agent->>GCal: 6b. Calendar API call
        GCal->>Agent: 7b. Calendar events
    end
```

**Key Security Properties:**
- ✅ Real SaaS credentials stored in Auth0 Token Vault, not in app
- ✅ Agent receives scoped tokens per connection
- ✅ User context preserved across all exchanges
- ✅ Tokens retrieved on-demand, not persisted

### Flow 3: CIBA Step-Up — Human-in-the-Loop

```mermaid
sequenceDiagram
    participant Agent as Apex AI Agent
    participant API as Apex API
    participant Okta
    participant Phone as User's Phone

    Agent->>API: 1. process_payment($15,000)
    API->>API: 2. Check policy: amount > $10K threshold
    
    Note over API: High-value transaction requires step-up
    
    API->>Okta: 3. CIBA Authentication Request
    Note right of Okta: binding_message: "Approve $15K transfer"<br/>login_hint: alice@acme.com
    Okta->>Phone: 4. Push notification
    Phone->>Phone: 5. User reviews details
    Phone->>Okta: 6. User approves
    Okta->>API: 7. Auth complete + tokens
    API->>API: 8. Execute transfer
    API->>Agent: 9. Transaction confirmed
```

---

## 🚀 Deployment

### Live Demo
- **Frontend:** https://apex-wealth-advisor.vercel.app
- **API:** https://apex-wealth-api.onrender.com

### Infrastructure

| Component | Platform | Purpose |
|-----------|----------|---------|
| Frontend | Vercel | React chat interface |
| API | Render | FastAPI backend |
| MCP Server | Embedded | Internal portfolio data |
| Salesforce | Cloud | CRM integration |
| Google Calendar | Cloud | Scheduling integration |
| Okta | Cloud | XAA, authentication |
| Auth0 | Cloud | Token Vault |

---

## 📁 Project Structure

```
apex-wealth-advisor/
├── api/
│   └── main.py                 # FastAPI entry point
├── auth/
│   ├── okta_cross_app_access.py  # XAA token exchange
│   └── token_vault.py            # Auth0 Token Vault
├── mcp_server/
│   └── wealth_mcp.py           # Internal MCP tools
├── services/
│   └── claude_service.py       # Claude AI orchestration
├── tools/
│   ├── google_calendar.py      # Calendar operations
│   └── salesforce_tools.py     # CRM operations
├── frontend/
│   └── src/
│       └── components/
│           ├── ChatInterface.tsx
│           ├── PromptLibrary.tsx
│           └── SecurityFlowTab.tsx
├── requirements.txt
└── render.yaml
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Okta XAA
OKTA_ORG_URL=https://your-org.oktapreview.com
OKTA_CLIENT_ID=0oa...
OKTA_CLIENT_SECRET=...
OKTA_AGENT_ID=wlpt...
OKTA_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
OKTA_MCP_AUTH_SERVER_ID=aus...
OKTA_MCP_AUDIENCE=apex-wealth-mcp

# Auth0 Token Vault
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_VAULT_CLIENT_ID=...
AUTH0_VAULT_CLIENT_SECRET=...

# Salesforce
SF_INSTANCE_URL=https://your-instance.salesforce.com
```

---

## 🔧 Local Development

```bash
# Clone
git clone https://github.com/kunkol/apex-wealth-advisor.git
cd apex-wealth-advisor

# Backend
pip install -r requirements.txt
cp .env.template .env
# Edit .env with your credentials
uvicorn api.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## 🏷️ Version History

| Tag | Date | Description |
|-----|------|-------------|
| `production-ready-20260107` | Jan 7, 2026 | 24/24 tests passed, demo ready |
| `pre-cleanup-fix-20260107` | Jan 7, 2026 | Before UI cleanup |
| `working-natural-prompting-20260107` | Jan 7, 2026 | Natural language routing working |
| `v1.0-baseline` | Dec 2025 | Initial baseline |

### Recovery

```bash
# Restore to production-ready state
git checkout production-ready-20260107 -- frontend/src/components/PromptLibrary.tsx tools/salesforce_tools.py
git add -A && git commit -m "RESTORE" && git push
```

---

## 📚 Resources

### Okta Documentation
- [Cross-App Access (XAA)](https://developer.okta.com/docs/guides/cross-app-access)
- [ID-JAG Token Specification](https://developer.okta.com/docs/concepts/id-jag)

### Auth0 Documentation
- [Token Vault](https://auth0.com/docs/secure/tokens/token-vault)
- [Managed Connections](https://auth0.com/docs/authenticate/identity-providers/managed-connections)

### Standards
- [RFC 8693 - OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)
- [OpenID CIBA](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html)

---

## 🙏 Credits

- **Indranil Banerjee** (Okta) - [Okta Agentic AI Demo](https://github.com/indranilokg/okta-agentic-ai-demo) - MCP architecture reference
- **Abhishek Hingnikar** (Auth0) - Token Vault integration patterns ([internal reference](https://github.com/atko-scratch/dell-ai-demo/tree/google/okta-idp-with-token-vault))

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>AI Agent Security Demo</strong><br>
  <em>Okta + Auth0 + Anthropic Claude</em>
</p>
