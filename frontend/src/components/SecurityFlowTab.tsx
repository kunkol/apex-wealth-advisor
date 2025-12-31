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

function TokenCard({ title, token, color }: { title: string; token?: string; color: string }) {
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
            {/* Step 1: Okta ID Token */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Step 1</span>
                <span className="text-xs text-slate-400">Okta Authentication</span>
              </div>
              <TokenCard 
                title="Okta ID Token" 
                token={idToken} 
                color="border-blue-500/30 bg-blue-900/10"
              />
            </div>

            {/* Step 2: ID-JAG Token */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">Step 2</span>
                <span className="text-xs text-slate-400">XAA Exchange</span>
              </div>
              <TokenCard 
                title="ID-JAG Token" 
                token={xaaInfo?.id_jag_token} 
                color="border-cyan-500/30 bg-cyan-900/10"
              />
            </div>

            {/* Step 3: MCP Auth Server Token */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Step 3</span>
                <span className="text-xs text-slate-400">Auth Server Token</span>
              </div>
              <TokenCard 
                title="MCP Token" 
                token={xaaInfo?.mcp_token} 
                color="border-green-500/30 bg-green-900/10"
              />
            </div>

            {/* Step 4: Auth0 Vault Token */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Step 4</span>
                <span className="text-xs text-slate-400">Token Vault Exchange</span>
              </div>
              <TokenCard 
                title="Auth0 Vault Token" 
                token={tokenVaultInfo?.vault_token} 
                color="border-purple-500/30 bg-purple-900/10"
              />
            </div>

            {/* Step 5: Google Token */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Step 5</span>
                <span className="text-xs text-slate-400">Federated Token</span>
              </div>
              <TokenCard 
                title="Google Calendar Token" 
                token={tokenVaultInfo?.google_token} 
                color="border-red-500/30 bg-red-900/10"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Audit Trail */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">📋 Audit Trail</h2>
              <p className="text-xs text-slate-500">Real-time security event log</p>
            </div>
            {auditTrail.length > 0 && (
              <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                {auditTrail.length} events
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {auditTrail.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-slate-400 text-sm">No events yet</p>
                <p className="text-slate-600 text-xs mt-1">Make a request in the Agent tab to see the security flow</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditTrail.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border ${
                      entry.status === 'success' ? 'border-green-500/30 bg-green-900/10' :
                      entry.status === 'error' ? 'border-red-500/30 bg-red-900/10' :
                      'border-amber-500/30 bg-amber-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          entry.status === 'success' ? 'bg-green-500' :
                          entry.status === 'error' ? 'bg-red-500' :
                          'bg-amber-500 animate-pulse'
                        }`}></span>
                        <span className="text-sm font-medium text-white">{entry.step}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    
                    {entry.details && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.details.tokenType && (
                          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                            {entry.details.tokenType}
                          </span>
                        )}
                        {entry.details.expiresIn && (
                          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                            Expires: {entry.details.expiresIn}s
                          </span>
                        )}
                        {entry.details.connection && (
                          <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">
                            {entry.details.connection}
                          </span>
                        )}
                        {entry.details.scopes && entry.details.scopes.length > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                            Scopes: {entry.details.scopes.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Flow Summary */}
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50">
            <div className="text-xs text-slate-400">
              <span className="font-medium text-white">Token Flow:</span>{' '}
              Okta Login → ID-JAG → MCP Token → Auth0 Vault → Google/Salesforce
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
