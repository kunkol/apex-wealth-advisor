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
  currentRequestEvents: AuditEntry[];
  sessionAuditLog: AuditEntry[];
  xaaInfo: any;
  tokenVaultInfo: any;
  toolsCalled?: string[];
}

// Helper to detect which tools use which backend
const CALENDAR_TOOLS = ['list_calendar_events', 'get_calendar_event', 'create_calendar_event', 'check_availability', 'cancel_calendar_event'];
const SALESFORCE_TOOLS = ['search_salesforce_contacts', 'get_contact_opportunities', 'get_sales_pipeline', 'get_high_value_accounts', 'create_salesforce_task', 'create_salesforce_note', 'get_pipeline_value', 'update_opportunity_stage'];

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

function TokenCard({ title, token, color, stepNumber, icon, wasUsed, isOpaque }: { title: string; token?: string; color: string; stepNumber: number | string; icon?: string; wasUsed?: boolean; isOpaque?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const decoded = (token && !isOpaque) ? decodeJWT(token) : null;
  const truncatedToken = token ? `${token.slice(0, 20)}...${token.slice(-10)}` : null;
  const isObtained = token || wasUsed;
  
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
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <div className="text-left">
            <p className="text-sm font-medium text-white">{title}</p>
            {truncatedToken && (
              <p className="text-xs text-slate-500 font-mono">{truncatedToken}</p>
            )}
            {!truncatedToken && wasUsed && (
              <p className="text-xs text-slate-500">Token retrieved from vault</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isObtained ? (
            <span className="text-xs text-green-400">✓ Obtained</span>
          ) : (
            <span className="text-xs text-slate-500">Pending</span>
          )}
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {expanded && (token || wasUsed) && (
        <div className="px-3 pb-3 border-t border-slate-800">
          <div className="mt-2 space-y-2">
            {token ? (
              <>
                {/* Raw Token */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Raw Token</span>
                    <button onClick={copyToken} className="text-xs text-blue-400 hover:text-blue-300">
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <code className="block text-xs text-slate-300 bg-slate-900 p-2 rounded font-mono break-all max-h-20 overflow-y-auto">
                    {token}
                  </code>
                </div>
                
                {/* Opaque token note */}
                {isOpaque && (
                  <div className="bg-amber-900/20 rounded p-2 border border-amber-500/20">
                    <p className="text-xs text-amber-400">⚠️ Opaque Token</p>
                    <p className="text-xs text-slate-400 mt-1">Google access tokens (ya29.*) are opaque and cannot be decoded. Only Google's servers can validate them.</p>
                  </div>
                )}
                
                {/* Decoded JWT */}
                {decoded && !isOpaque && (
                  <div>
                    <span className="text-xs text-slate-500">Decoded Payload</span>
                    <pre className="mt-1 text-xs text-slate-300 bg-slate-900 p-2 rounded font-mono overflow-x-auto max-h-32 overflow-y-auto">
                      {JSON.stringify(decoded, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-800/50 rounded p-2">
                <p className="text-xs text-green-400 mb-1">✓ Token successfully retrieved and used</p>
                <p className="text-xs text-slate-500">The federated token was securely retrieved from Auth0 Token Vault and used to access the external API. Token details are not exposed to the frontend for security.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Security gap mapping
const SECURITY_GAPS: Record<string, { gaps: string[]; description: string }> = {
  'ID-JAG': { 
    gaps: ['No User Context', 'Overprivileged Access'], 
    description: 'User identity preserved in delegated agent token'
  },
  'MCP': { 
    gaps: ['Overprivileged Access', 'No Audit Trail'], 
    description: 'Scoped access token for MCP server'
  },
  'Vault': { 
    gaps: ['Shadow IT', 'No Audit Trail'], 
    description: 'Federated identity exchange via Token Vault'
  },
  'Google': { 
    gaps: ['Shadow IT', 'No User Context'], 
    description: 'User-delegated access to Google Calendar'
  },
  'Salesforce': { 
    gaps: ['Shadow IT', 'No User Context'], 
    description: 'User-delegated access to Salesforce CRM'
  },
  'Tool': { 
    gaps: ['No Audit Trail'], 
    description: 'Tool execution logged with user context'
  }
};

function AuditCard({ entry, xaaInfo, tokenVaultInfo }: { entry: AuditEntry; xaaInfo: any; tokenVaultInfo: any }) {
  const [expanded, setExpanded] = useState(false);
  
  // Find which security gaps this step addresses
  const getSecurityInfo = () => {
    const step = entry.step;
    if (step.includes('ID-JAG')) return SECURITY_GAPS['ID-JAG'];
    if (step.includes('MCP')) return SECURITY_GAPS['MCP'];
    if (step.includes('Vault')) return SECURITY_GAPS['Vault'];
    if (step.includes('Google') || step.includes('Calendar')) return SECURITY_GAPS['Google'];
    if (step.includes('Salesforce')) return SECURITY_GAPS['Salesforce'];
    if (step.includes('Tool:')) return SECURITY_GAPS['Tool'];
    return null;
  };
  
  // Get the relevant decoded token
  const getDecodedToken = () => {
    const step = entry.step;
    if (step.includes('ID-JAG') && xaaInfo?.id_jag_token) {
      return decodeJWT(xaaInfo.id_jag_token);
    }
    if (step.includes('MCP') && xaaInfo?.mcp_token) {
      return decodeJWT(xaaInfo.mcp_token);
    }
    if (step.includes('Vault') && tokenVaultInfo?.vault_token) {
      return decodeJWT(tokenVaultInfo.vault_token);
    }
    return null;
  };
  
  const securityInfo = getSecurityInfo();
  const decoded = getDecodedToken();
  
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className={`rounded-lg border overflow-hidden ${
      entry.status === 'success' ? 'border-green-500/30 bg-green-900/10' :
      entry.status === 'error' ? 'border-red-500/30 bg-red-900/10' :
      'border-amber-500/30 bg-amber-900/10'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            entry.status === 'success' ? 'bg-green-500' :
            entry.status === 'error' ? 'bg-red-500' :
            'bg-amber-500'
          }`}></span>
          <span className={`text-sm font-medium ${
            entry.step.includes('Salesforce') ? 'text-sky-400' :
            entry.step.includes('Google') || entry.step.includes('Calendar') ? 'text-rose-400' :
            entry.step.includes('Tool:') ? 'text-amber-400' :
            'text-white'
          }`}>
            {entry.step}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{formatTime(entry.timestamp)}</span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-800 space-y-2">
          {/* Basic details */}
          {entry.details && (
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.details.tokenType && (
                <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                  {entry.details.tokenType}
                </span>
              )}
              {entry.details.expiresIn && (
                <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                  TTL: {entry.details.expiresIn}s
                </span>
              )}
              {entry.details.connection && (
                <span className={`text-xs px-2 py-0.5 rounded ${
                  entry.details.connection === 'salesforce' 
                    ? 'bg-sky-500/20 text-sky-400' 
                    : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {entry.details.connection}
                </span>
              )}
            </div>
          )}
          
          {/* Security gaps solved */}
          {securityInfo && (
            <div className="bg-green-900/20 rounded p-2 border border-green-500/20">
              <p className="text-xs text-slate-400 mb-1">{securityInfo.description}</p>
              <div className="flex flex-wrap gap-1">
                {securityInfo.gaps.map((gap, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                    ✓ {gap}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Key claims from decoded token */}
          {decoded && (
            <div className="bg-slate-800/50 rounded p-2">
              <p className="text-[10px] text-slate-500 mb-1">Key Claims:</p>
              <div className="text-xs text-slate-300 space-y-0.5">
                {decoded.sub && <p><span className="text-slate-500">sub:</span> {decoded.sub}</p>}
                {decoded.aud && <p><span className="text-slate-500">aud:</span> {Array.isArray(decoded.aud) ? decoded.aud.join(', ') : decoded.aud}</p>}
                {decoded.scope && <p><span className="text-slate-500">scope:</span> {decoded.scope}</p>}
                {decoded.scp && <p><span className="text-slate-500">scp:</span> {decoded.scp.join(', ')}</p>}
                {decoded.exp && <p><span className="text-slate-500">exp:</span> {new Date(decoded.exp * 1000).toLocaleTimeString()}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SecurityFlowTab({ 
  session, 
  currentRequestEvents, 
  sessionAuditLog, 
  xaaInfo, 
  tokenVaultInfo,
  toolsCalled = []
}: SecurityFlowTabProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'logs'>('cards');

  // Determine which tokens were used based on tools called
  const usedCalendar = toolsCalled.some(t => CALENDAR_TOOLS.includes(t));
  const usedSalesforce = toolsCalled.some(t => SALESFORCE_TOOLS.includes(t));
  
  // Which audit trail to show
  const displayEvents = viewMode === 'cards' ? currentRequestEvents : sessionAuditLog;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="h-full p-4 overflow-hidden">
      <div className="h-full grid grid-cols-2 gap-4">
        {/* LEFT: Token Flow */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">🔐 Token Flow</h2>
            <p className="text-xs text-slate-500">View decoded tokens at each step</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Step 1: Okta ID Token */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Step 1</span>
                <span className="text-xs text-slate-400">Okta Authentication</span>
              </div>
              <TokenCard 
                title="Okta ID Token" 
                token={(session as any)?.idToken} 
                color="border-blue-500/30 bg-blue-900/10" 
                stepNumber={1}
                icon="🔐"
              />
            </div>

            {/* Step 2: ID-JAG Token */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded">Step 2</span>
                <span className="text-xs text-slate-400">XAA Exchange (ID-JAG)</span>
              </div>
              <TokenCard 
                title="ID-JAG Token" 
                token={xaaInfo?.id_jag_token} 
                color="border-indigo-500/30 bg-indigo-900/10" 
                stepNumber={2}
                icon="🔑"
              />
            </div>

            {/* Step 3: MCP Token */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Step 3</span>
                <span className="text-xs text-slate-400">Auth Server Token</span>
              </div>
              <TokenCard 
                title="MCP Token" 
                token={xaaInfo?.mcp_token} 
                color="border-green-500/30 bg-green-900/10" 
                stepNumber={3}
                icon="🎫"
              />
            </div>

            {/* Step 4: Auth0 Vault Token */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Step 4</span>
                <span className="text-xs text-slate-400">Token Vault Exchange</span>
              </div>
              <TokenCard 
                title="Auth0 Vault Token" 
                token={tokenVaultInfo?.vault_token} 
                color="border-purple-500/30 bg-purple-900/10" 
                stepNumber={4}
                icon="🏦"
              />
            </div>

            {/* Step 5: Federated Tokens - DYNAMIC based on tools called */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">Step 5</span>
                <span className="text-xs text-slate-400">Federated Token</span>
              </div>
              
              {/* Show Google Calendar Token if calendar tools were used */}
              {usedCalendar && (
                <div className="mb-2">
                  <TokenCard 
                    title="Google Calendar Token" 
                    token={tokenVaultInfo?.google?.token} 
                    color="border-rose-500/30 bg-rose-900/10" 
                    stepNumber="5"
                    icon="📅"
                    wasUsed={true}
                    isOpaque={true}
                  />
                </div>
              )}
              
              {/* Show Salesforce Token if salesforce tools were used */}
              {usedSalesforce && (
                <div className="mb-2">
                  <TokenCard 
                    title="Salesforce Token" 
                    token={tokenVaultInfo?.salesforce?.token} 
                    color="border-sky-500/30 bg-sky-900/10" 
                    stepNumber="5"
                    icon="☁️"
                    wasUsed={true}
                  />
                </div>
              )}
              
              {/* Show Internal MCP message if only internal tools were used */}
              {!usedCalendar && !usedSalesforce && toolsCalled.length > 0 && (
                <div className="p-3 rounded-lg border border-green-500/30 bg-green-900/10">
                  <div className="flex items-center gap-2">
                    <span>🔧</span>
                    <span className="text-sm text-green-400 font-medium">Internal MCP Tools</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">No federated token needed - uses Okta XAA flow only</p>
                </div>
              )}
              
              {/* Fallback if no tools called yet */}
              {toolsCalled.length === 0 && (
                <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                  <span className="text-xs text-slate-500">Make a request to see federated tokens</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Audit Trail */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">📋 Audit Trail</h2>
              <p className="text-xs text-slate-500">Current request events</p>
            </div>
            <div className="flex items-center gap-2">
              {displayEvents.length > 0 && (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                  {viewMode === 'cards' ? `${currentRequestEvents.length} current` : `${sessionAuditLog.length} total`}
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
            {displayEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-slate-400 text-sm">No events yet</p>
                <p className="text-slate-600 text-xs mt-1">Make a request in the Agent tab to see the security flow</p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="space-y-2">
                {displayEvents.map((entry) => (
                  <AuditCard key={entry.id} entry={entry} xaaInfo={xaaInfo} tokenVaultInfo={tokenVaultInfo} />
                ))}
              </div>
            ) : (
              /* Logs View - Continuous flow like Render logs */
              <div className="font-mono text-xs space-y-0.5">
                {displayEvents.map((entry, index) => (
                  <div 
                    key={entry.id}
                    className="flex items-start gap-2 py-1 px-2 hover:bg-slate-800/50 rounded cursor-pointer group"
                    title="Double-click to expand"
                  >
                    <span className="text-slate-600 w-16 flex-shrink-0">{formatTime(entry.timestamp)}</span>
                    <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                      entry.status === 'success' ? 'bg-green-500' :
                      entry.status === 'error' ? 'bg-red-500' :
                      'bg-amber-500'
                    }`}></span>
                    <span className={`flex-1 ${
                      entry.step.includes('Salesforce') ? 'text-sky-400' :
                      entry.step.includes('Google') || entry.step.includes('Calendar') ? 'text-rose-400' :
                      entry.step.includes('Tool:') ? 'text-amber-400' :
                      entry.step.includes('Error') ? 'text-red-400' :
                      'text-slate-300'
                    }`}>
                      {entry.step}
                      {entry.details?.expiresIn && <span className="text-slate-600 ml-2">TTL:{entry.details.expiresIn}s</span>}
                      {entry.details?.connection && <span className="text-slate-600 ml-2">[{entry.details.connection}]</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
