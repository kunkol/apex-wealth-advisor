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

  // Get security insight based on token type
  const getSecurityInsight = () => {
    if (!decoded) return null;
    
    switch(stepNumber) {
      case 1: // Okta ID Token
        return {
          userContext: decoded.email || decoded.sub,
          insight: "User authenticated via Okta SSO",
          solves: ["Shadow IT - Agent registered with IdP"]
        };
      case 2: // ID-JAG Token
        return {
          userContext: decoded.sub,
          agentId: decoded.client_id,
          scope: decoded.scope,
          ttl: decoded.exp ? Math.round((decoded.exp - decoded.iat) / 60) + " minutes" : "N/A",
          insight: "User identity preserved in agent token",
          solves: ["No User Context - sub claim carries user ID", "Short-lived token (5 min)"]
        };
      case 3: // MCP Token
        return {
          userContext: decoded.sub,
          audience: decoded.aud,
          scopes: decoded.scp || [decoded.scope],
          insight: "Scoped access token for MCP server",
          solves: ["Overprivileged Access - scoped to mcp:read only", "Full Audit Trail - user identity in token"]
        };
      case 4: // Vault Token
        return {
          userContext: decoded.sub,
          audience: decoded.aud,
          insight: "Federated identity exchange (Okta → Auth0)",
          solves: ["Token Vault - secure token storage", "No credential exposure to agent"]
        };
      case 5: // Google Token
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
          {/* Security Insight Panel */}
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

          {/* Decoded Claims */}
          {decoded && (
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">Decoded Claims</span>
              </div>
              <pre className="text-xs text-slate-300 overflow-x-auto max-h-48 overflow-y-auto">
                {JSON.stringify(decoded, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Raw Token */}
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

// Enhanced Audit Entry Component
function AuditEntryCard({ entry, xaaInfo, tokenVaultInfo, idToken }: { entry: AuditEntry; xaaInfo: any; tokenVaultInfo: any; idToken: string }) {
  const [expanded, setExpanded] = useState(false);
  
  // Determine what security gaps this step solves
  const getSecurityContext = () => {
    const step = entry.step.toLowerCase();
    
    if (step.includes('user request')) {
      return {
        type: 'user-delegated',
        label: 'User Action',
        color: 'blue',
        description: 'User initiated request',
        gaps: []
      };
    }
    
    if (step.includes('id-jag')) {
      const decoded = xaaInfo?.id_jag_token ? decodeJWT(xaaInfo.id_jag_token) : null;
      return {
        type: 'user-delegated',
        label: 'User-Delegated',
        color: 'cyan',
        description: 'User identity preserved in agent token',
        gaps: ['No User Context', 'Overprivileged Access'],
        claims: decoded ? {
          sub: decoded.sub,
          scope: decoded.scope,
          ttl: '5 minutes'
        } : null
      };
    }
    
    if (step.includes('mcp')) {
      const decoded = xaaInfo?.mcp_token ? decodeJWT(xaaInfo.mcp_token) : null;
      return {
        type: 'user-delegated',
        label: 'Scoped Access',
        color: 'green',
        description: 'Least-privilege token for MCP',
        gaps: ['Overprivileged Access', 'No Audit Trail'],
        claims: decoded ? {
          sub: decoded.sub,
          aud: decoded.aud,
          scp: decoded.scp?.join(', ')
        } : null
      };
    }
    
    if (step.includes('vault')) {
      const decoded = tokenVaultInfo?.vault_token ? decodeJWT(tokenVaultInfo.vault_token) : null;
      return {
        type: 'user-delegated',
        label: 'Token Vault',
        color: 'purple',
        description: 'Federated identity exchange',
        gaps: ['Shadow IT', 'No Audit Trail'],
        claims: decoded ? {
          sub: decoded.sub,
          aud: decoded.aud
        } : null
      };
    }
    
    if (step.includes('google') || step.includes('calendar')) {
      return {
        type: 'user-delegated',
        label: 'User Token',
        color: 'red',
        description: "User's Google token from vault",
        gaps: ['Shadow IT', 'No User Context'],
        claims: {
          type: 'Opaque Token',
          connection: 'google-oauth2'
        }
      };
    }
    
    if (step.includes('tool')) {
      return {
        type: 'user-delegated',
        label: 'Tool Call',
        color: 'amber',
        description: 'Agent executed tool on behalf of user',
        gaps: ['No Audit Trail'],
        claims: null
      };
    }
    
    return {
      type: 'unknown',
      label: 'Event',
      color: 'slate',
      description: '',
      gaps: []
    };
  };
  
  const context = getSecurityContext();
  const colorMap: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-900/10',
    cyan: 'border-cyan-500/30 bg-cyan-900/10',
    green: 'border-green-500/30 bg-green-900/10',
    purple: 'border-purple-500/30 bg-purple-900/10',
    red: 'border-red-500/30 bg-red-900/10',
    amber: 'border-amber-500/30 bg-amber-900/10',
    slate: 'border-slate-500/30 bg-slate-900/10'
  };
  const labelColorMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    red: 'bg-red-500/20 text-red-400',
    amber: 'bg-amber-500/20 text-amber-400',
    slate: 'bg-slate-500/20 text-slate-400'
  };

  return (
    <div className={`rounded-lg border ${colorMap[context.color]} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            entry.status === 'success' ? 'bg-green-500' :
            entry.status === 'error' ? 'bg-red-500' :
            'bg-amber-500 animate-pulse'
          }`}></span>
          <span className="text-sm font-medium text-white">{entry.step}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${labelColorMap[context.color]}`}>
            {context.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {context.description && (
            <p className="text-xs text-slate-400">{context.description}</p>
          )}
          
          {context.claims && (
            <div className="bg-slate-800/50 rounded p-2">
              <p className="text-[10px] text-slate-500 mb-1">Key Claims:</p>
              {Object.entries(context.claims).map(([key, value]) => (
                <p key={key} className="text-xs text-slate-300">
                  <span className="text-slate-500">{key}:</span> {String(value)}
                </p>
              ))}
            </div>
          )}
          
          {context.gaps && context.gaps.length > 0 && (
            <div className="bg-green-900/20 rounded p-2 border border-green-500/20">
              <p className="text-[10px] text-green-400 font-medium mb-1">Security Gaps Solved:</p>
              {context.gaps.map((gap, i) => (
                <p key={i} className="text-[10px] text-green-300">✓ {gap}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SecurityFlowTab({ session, auditTrail, xaaInfo, tokenVaultInfo }: SecurityFlowTabProps) {
  const idToken = (session as any)?.idToken || '';
  
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

        {/* RIGHT: Enhanced Audit Trail */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">📋 Audit Trail</h2>
              <p className="text-xs text-slate-500">Security events with gap analysis</p>
            </div>
            {auditTrail.length > 0 && (
              <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                {auditTrail.length} events
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {auditTrail.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-slate-400 text-sm mb-2">No events yet</p>
                <p className="text-slate-600 text-xs">Make a request in the Agent tab to see the security flow</p>
                
                {/* Legend */}
                <div className="mt-6 p-4 bg-slate-800/50 rounded-xl text-left">
                  <p className="text-xs font-semibold text-slate-400 mb-3">What you'll see:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-400">User-Delegated</span>
                      <span className="text-[10px] text-slate-500">User identity flows with agent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-500/20 text-green-400">Scoped Access</span>
                      <span className="text-[10px] text-slate-500">Least-privilege tokens</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-400">Token Vault</span>
                      <span className="text-[10px] text-slate-500">Secure token storage</span>
                    </div>
                  </div>
                  
                  <p className="text-xs font-semibold text-slate-400 mt-4 mb-2">Security gaps solved:</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                    <span>✓ Shadow IT</span>
                    <span>✓ No User Context</span>
                    <span>✓ Overprivileged Access</span>
                    <span>✓ No Audit Trail</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {auditTrail.map((entry) => (
                  <AuditEntryCard 
                    key={entry.id} 
                    entry={entry} 
                    xaaInfo={xaaInfo}
                    tokenVaultInfo={tokenVaultInfo}
                    idToken={idToken}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Footer with comparison */}
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-green-400 font-medium">User-Delegated Access</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="line-through">Workload Identity</span>
                <span className="text-red-400">✗</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Every action is attributable to a user, not a service account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
