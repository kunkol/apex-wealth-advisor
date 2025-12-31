'use client';

import { useState } from 'react';

interface AuditEntry {
  id: string;
  timestamp: Date;
  step: string;
  status: 'success' | 'pending' | 'error';
  details: {
    tokenType?: string;
    audience?: string;
    expiresIn?: number;
    scopes?: string[];
    connection?: string;
  };
  rawToken?: string;
}

interface SecurityFlowTabProps {
  session: any;
  auditTrail: AuditEntry[];
  xaaInfo: any;
  tokenVaultInfo: any;
}

function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

function TokenCard({ title, token, color, stepNumber }: { title: string; token?: string; color: string; stepNumber: number }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const decoded = token ? decodeJWT(token) : null;
  
  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSecurityInsight = () => {
    if (!decoded) return null;
    
    switch(stepNumber) {
      case 1:
        return {
          userContext: decoded.email || decoded.sub,
          insight: "User authenticated via Okta SSO",
          solves: ["Shadow IT - Agent registered with IdP"]
        };
      case 2:
        return {
          userContext: decoded.sub,
          agentId: decoded.client_id,
          scope: decoded.scope,
          ttl: decoded.exp ? Math.round((decoded.exp - decoded.iat) / 60) + " minutes" : "N/A",
          insight: "User identity preserved in agent token",
          solves: ["No User Context - sub claim carries user ID", "Short-lived token (5 min)"]
        };
      case 3:
        return {
          userContext: decoded.sub,
          audience: decoded.aud,
          scopes: decoded.scp || [decoded.scope],
          insight: "Scoped access token for MCP server",
          solves: ["Overprivileged Access - scoped to mcp:read only", "Full Audit Trail - user identity in token"]
        };
      case 4:
        return {
          userContext: decoded.sub,
          audience: decoded.aud,
          insight: "Federated identity exchange (Okta → Auth0)",
          solves: ["Token Vault - secure token storage", "No credential exposure to agent"]
        };
      case 5:
        return {
          insight: "User's Google token retrieved from vault",
          solves: ["User-Delegated Access - agent acts as user", "No service account needed"]
        };
      default:
        return null;
    }
  };

  const securityInsight = getSecurityInsight();

  return (
    <div className={`rounded-xl border ${color} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${token ? 'bg-green-500' : 'bg-slate-600'}`}></div>
          <span className="font-medium text-white text-sm">{title}</span>
          {token && <span className="text-xs text-green-400">✓ Obtained</span>}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {expanded && token && (
        <div className="px-4 pb-4 space-y-3">
          {securityInsight && (
            <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
              <p className="text-xs font-semibold text-green-400 mb-2">🔐 Security Insight</p>
              {securityInsight.userContext && (
                <p className="text-xs text-slate-300 mb-1">
                  <span className="text-slate-500">User:</span> {securityInsight.userContext}
                </p>
              )}
              {securityInsight.agentId && (
                <p className="text-xs text-slate-300 mb-1">
                  <span className="text-slate-500">Agent:</span> {securityInsight.agentId}
                </p>
              )}
              {securityInsight.scope && (
                <p className="text-xs text-slate-300 mb-1">
                  <span className="text-slate-500">Scope:</span> {securityInsight.scope}
                </p>
              )}
              {securityInsight.ttl && (
                <p className="text-xs text-slate-300 mb-1">
                  <span className="text-slate-500">TTL:</span> {securityInsight.ttl}
                </p>
              )}
              {securityInsight.solves && securityInsight.solves.length > 0 && (
                <div className="mt-2 pt-2 border-t border-green-500/20">
                  <p className="text-[10px] text-green-400 font-medium mb-1">Solves:</p>
                  {securityInsight.solves.map((item, i) => (
                    <p key={i} className="text-[10px] text-green-300">✓ {item}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {decoded && (
            <div className="bg-slate-800/50 rounded-lg p-3">
              <span className="text-xs font-medium text-slate-400">Decoded Claims</span>
              <pre className="text-xs text-slate-300 overflow-x-auto max-h-48 overflow-y-auto mt-2">
                {JSON.stringify(decoded, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Raw Token</span>
              <button
                onClick={copyToken}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-500 font-mono break-all line-clamp-3">
              {token}
            </p>
          </div>
        </div>
      )}
      
      {expanded && !token && (
        <div className="px-4 pb-4">
          <p className="text-xs text-slate-500 italic">No token available yet. Make a request to see token details.</p>
        </div>
      )}
    </div>
  );
}

// Security gap info
const SECURITY_GAPS = {
  'user-request': {
    label: 'User Action',
    color: 'blue',
    icon: '👤',
    description: 'User initiated authenticated request',
    checkmarks: ['User identity verified via Okta SSO', 'Session bound to authenticated user', 'Request logged with user attribution'],
    comparison: { good: 'User-Delegated: Request tied to specific user', bad: 'Workload Identity: Service account, no user context' }
  },
  'id-jag': {
    label: 'ID-JAG Exchange',
    color: 'cyan',
    icon: '🔑',
    description: 'Identity Assertion Grant - User context flows to agent',
    checkmarks: ['User sub claim preserved in token', 'Agent client_id identifies the agent', 'Short-lived (5 min) - limits blast radius', 'Scope restricted to mcp:read'],
    comparison: { good: 'User-Delegated: Agent acts AS the user', bad: 'Workload Identity: Agent acts as itself with broad access' }
  },
  'mcp-token': {
    label: 'MCP Token',
    color: 'green',
    icon: '🎫',
    description: 'Auth Server token for MCP Server access',
    checkmarks: ['Audience locked to apex-wealth-mcp', 'User identity (sub) preserved', 'Scoped to mcp:read only', 'Full audit trail capability'],
    comparison: { good: 'User-Delegated: Least-privilege, user-scoped', bad: 'Workload Identity: Broad permissions, no user context' }
  },
  'vault-token': {
    label: 'Vault Token',
    color: 'purple',
    icon: '🏦',
    description: 'Auth0 Token Vault - Federated identity exchange',
    checkmarks: ['Okta identity federated to Auth0', 'User sub: okta|oktapoc|{user_id}', 'Secure token storage (no exposure)', 'Automatic token refresh'],
    comparison: { good: 'Token Vault: Secure, user-bound, auto-refresh', bad: 'Manual tokens: Exposed credentials, long-lived' }
  },
  'google-token': {
    label: 'Google Token',
    color: 'red',
    icon: '📅',
    description: "User's Google Calendar token from vault",
    checkmarks: ["User's own Google account", 'Agent never sees raw credentials', 'Access limited to user calendar', 'Revocable via Auth0 or Google'],
    comparison: { good: 'User-Delegated: User calendar only', bad: 'Service Account: All calendars, no user context' }
  },
  'tool-call': {
    label: 'Tool Execution',
    color: 'amber',
    icon: '⚡',
    description: 'Agent executed tool on behalf of user',
    checkmarks: ['Full audit trail with user + agent', 'Action attributable to specific user', 'Surgical revocation possible', 'Compliance-ready logging'],
    comparison: { good: 'Full Attribution: user → agent → tool → result', bad: 'No Attribution: service-account → tool → ???' }
  }
};

function getStepType(step: string): keyof typeof SECURITY_GAPS {
  const s = step.toLowerCase();
  if (s.includes('user request')) return 'user-request';
  if (s.includes('id-jag')) return 'id-jag';
  if (s.includes('mcp')) return 'mcp-token';
  if (s.includes('vault')) return 'vault-token';
  if (s.includes('google') || s.includes('calendar')) return 'google-token';
  if (s.includes('tool')) return 'tool-call';
  return 'user-request';
}

function EnhancedAuditEntry({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const stepType = getStepType(entry.step);
  const gapInfo = SECURITY_GAPS[stepType];
  
  const colorMap: Record<string, { border: string; bg: string; badge: string }> = {
    blue: { border: 'border-blue-500/30', bg: 'bg-blue-900/10', badge: 'bg-blue-500/20 text-blue-400' },
    cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-900/10', badge: 'bg-cyan-500/20 text-cyan-400' },
    green: { border: 'border-green-500/30', bg: 'bg-green-900/10', badge: 'bg-green-500/20 text-green-400' },
    purple: { border: 'border-purple-500/30', bg: 'bg-purple-900/10', badge: 'bg-purple-500/20 text-purple-400' },
    red: { border: 'border-red-500/30', bg: 'bg-red-900/10', badge: 'bg-red-500/20 text-red-400' },
    amber: { border: 'border-amber-500/30', bg: 'bg-amber-900/10', badge: 'bg-amber-500/20 text-amber-400' }
  };
  
  const colors = colorMap[gapInfo.color];

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{gapInfo.icon}</span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm">{entry.step}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.badge}`}>{gapInfo.label}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{gapInfo.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${entry.status === 'success' ? 'bg-green-500' : entry.status === 'error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`}></span>
          <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs font-semibold text-green-400 mb-2">✅ Security Checkmarks</p>
            <div className="space-y-1.5">
              {gapInfo.checkmarks.map((check, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-green-400 text-xs mt-0.5">✓</span>
                  <span className="text-xs text-slate-300">{check}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/20">
              <p className="text-[10px] font-bold text-green-400 mb-1">✓ THIS DEMO</p>
              <p className="text-xs text-green-300">{gapInfo.comparison.good}</p>
            </div>
            <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/20">
              <p className="text-[10px] font-bold text-red-400 mb-1">✗ WITHOUT OKTA</p>
              <p className="text-xs text-red-300">{gapInfo.comparison.bad}</p>
            </div>
          </div>
          
          {entry.details && (
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-400 mb-2">Token Details</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {entry.details.tokenType && <div><span className="text-slate-500">Type:</span> <span className="text-slate-300">{entry.details.tokenType}</span></div>}
                {entry.details.expiresIn && <div><span className="text-slate-500">TTL:</span> <span className="text-slate-300">{entry.details.expiresIn}s</span></div>}
                {entry.details.connection && <div><span className="text-slate-500">Connection:</span> <span className="text-slate-300">{entry.details.connection}</span></div>}
                {entry.details.audience && <div><span className="text-slate-500">Audience:</span> <span className="text-slate-300">{entry.details.audience}</span></div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Log format entry
function LogEntry({ entry }: { entry: AuditEntry }) {
  const stepType = getStepType(entry.step);
  const gapInfo = SECURITY_GAPS[stepType];
  const timestamp = new Date(entry.timestamp).toISOString();
  
  return (
    <div className="font-mono text-xs border-l-2 border-green-500 pl-3 py-1">
      <span className="text-slate-500">[{timestamp}]</span>{' '}
      <span className="text-green-400">{entry.status.toUpperCase()}</span>{' '}
      <span className="text-white">{entry.step}</span>
      {entry.details?.tokenType && <span className="text-slate-400"> type={entry.details.tokenType}</span>}
      {entry.details?.expiresIn && <span className="text-slate-400"> ttl={entry.details.expiresIn}s</span>}
      {entry.details?.connection && <span className="text-purple-400"> connection={entry.details.connection}</span>}
      <span className="text-cyan-400"> gaps_solved=[{gapInfo.checkmarks.length}]</span>
    </div>
  );
}

export default function SecurityFlowTab({ session, auditTrail, xaaInfo, tokenVaultInfo }: SecurityFlowTabProps) {
  const idToken = (session as any)?.idToken || '';
  const [viewMode, setViewMode] = useState<'cards' | 'logs'>('cards');
  
  return (
    <div className="h-full p-4 overflow-hidden">
      <div className="h-full grid grid-cols-2 gap-4">
        
        {/* LEFT: Token Display */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">🔐 Token Flow</h2>
            <p className="text-xs text-slate-500">View decoded tokens at each step</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Step 1</span>
                <span className="text-xs text-slate-400">Okta Authentication</span>
              </div>
              <TokenCard title="Okta ID Token" token={idToken} color="border-blue-500/30 bg-blue-900/10" stepNumber={1} />
            </div>

            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">Step 2</span>
                <span className="text-xs text-slate-400">XAA Exchange (ID-JAG)</span>
              </div>
              <TokenCard title="ID-JAG Token" token={xaaInfo?.id_jag_token} color="border-cyan-500/30 bg-cyan-900/10" stepNumber={2} />
            </div>

            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Step 3</span>
                <span className="text-xs text-slate-400">Auth Server Token</span>
              </div>
              <TokenCard title="MCP Token" token={xaaInfo?.mcp_token} color="border-green-500/30 bg-green-900/10" stepNumber={3} />
            </div>

            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Step 4</span>
                <span className="text-xs text-slate-400">Token Vault Exchange</span>
              </div>
              <TokenCard title="Auth0 Vault Token" token={tokenVaultInfo?.vault_token} color="border-purple-500/30 bg-purple-900/10" stepNumber={4} />
            </div>

            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Step 5</span>
                <span className="text-xs text-slate-400">Federated Token</span>
              </div>
              <TokenCard title="Google Calendar Token" token={tokenVaultInfo?.google_token} color="border-red-500/30 bg-red-900/10" stepNumber={5} />
            </div>
          </div>
        </div>

        {/* RIGHT: Audit Trail with View Toggle */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">📋 Audit Trail</h2>
              <p className="text-xs text-slate-500">Security events with gap analysis</p>
            </div>
            <div className="flex items-center gap-2">
              {auditTrail.length > 0 && (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                  {auditTrail.length} events
                </span>
              )}
              {/* View Toggle */}
              <div className="flex bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2 py-1 text-xs rounded ${viewMode === 'cards' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('logs')}
                  className={`px-2 py-1 text-xs rounded ${viewMode === 'logs' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                >
                  Logs
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {auditTrail.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-slate-400 text-sm mb-2">No events yet</p>
                <p className="text-slate-600 text-xs mb-6">Make a request in the Agent tab to see the security flow</p>
                
                <div className="text-left p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-xs font-semibold text-slate-400 mb-3">What you'll see:</p>
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2"><span className="text-green-400">✓</span><span>Security checkmarks per step</span></div>
                    <div className="flex items-center gap-2"><span className="text-green-400">✓</span><span>User-Delegated vs Workload comparison</span></div>
                    <div className="flex items-center gap-2"><span className="text-green-400">✓</span><span>Token details (TTL, scope, audience)</span></div>
                    <div className="flex items-center gap-2"><span className="text-green-400">✓</span><span>Log format view option</span></div>
                  </div>
                </div>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="space-y-3">
                {auditTrail.map((entry) => (
                  <EnhancedAuditEntry key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="bg-slate-900 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <span className="text-xs font-mono text-slate-400"># Security Audit Log</span>
                  <span className="text-xs text-slate-500">{auditTrail.length} entries</span>
                </div>
                {auditTrail.map((entry) => (
                  <LogEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
          
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-xs text-green-400 font-medium">User-Delegated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-xs text-slate-500 line-through">Workload Identity</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500">Every action → user attribution</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
