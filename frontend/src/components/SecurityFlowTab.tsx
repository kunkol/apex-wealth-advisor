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
    toolResult?: any; // Tool execution result data
    recordCount?: number; // Number of records fetched
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

// Comprehensive tool metadata
interface ToolMetadata {
  name: string;
  displayName: string;
  backend: 'internal-mcp' | 'google-calendar' | 'salesforce' | 'external-mcp';
  backendDisplay: string;
  apiName: string;
  apiEndpoint?: string;
  dataAccessed: string;
  icon: string;
  color: string;
}

const TOOL_METADATA: Record<string, ToolMetadata> = {
  // Google Calendar Tools
  'list_calendar_events': {
    name: 'list_calendar_events',
    displayName: 'List Calendar Events',
    backend: 'google-calendar',
    backendDisplay: 'Google Calendar API',
    apiName: 'Google Calendar API v3',
    apiEndpoint: 'calendar.events.list',
    dataAccessed: 'Calendar events, meeting times, attendees',
    icon: '📅',
    color: 'rose'
  },
  'get_calendar_event': {
    name: 'get_calendar_event',
    displayName: 'Get Calendar Event',
    backend: 'google-calendar',
    backendDisplay: 'Google Calendar API',
    apiName: 'Google Calendar API v3',
    apiEndpoint: 'calendar.events.get',
    dataAccessed: 'Event details, description, location',
    icon: '📅',
    color: 'rose'
  },
  'create_calendar_event': {
    name: 'create_calendar_event',
    displayName: 'Create Calendar Event',
    backend: 'google-calendar',
    backendDisplay: 'Google Calendar API',
    apiName: 'Google Calendar API v3',
    apiEndpoint: 'calendar.events.insert',
    dataAccessed: 'New event created on calendar',
    icon: '➕',
    color: 'rose'
  },
  'check_availability': {
    name: 'check_availability',
    displayName: 'Check Availability',
    backend: 'google-calendar',
    backendDisplay: 'Google Calendar API',
    apiName: 'Google Calendar API v3',
    apiEndpoint: 'calendar.freebusy.query',
    dataAccessed: 'Free/busy time slots',
    icon: '🕐',
    color: 'rose'
  },
  'cancel_calendar_event': {
    name: 'cancel_calendar_event',
    displayName: 'Cancel Calendar Event',
    backend: 'google-calendar',
    backendDisplay: 'Google Calendar API',
    apiName: 'Google Calendar API v3',
    apiEndpoint: 'calendar.events.delete',
    dataAccessed: 'Event removed from calendar',
    icon: '❌',
    color: 'rose'
  },
  
  // Salesforce Tools
  'search_salesforce_contacts': {
    name: 'search_salesforce_contacts',
    displayName: 'Search Contacts',
    backend: 'salesforce',
    backendDisplay: 'Salesforce CRM',
    apiName: 'Salesforce REST API v58.0',
    apiEndpoint: 'sobjects/Contact/search',
    dataAccessed: 'Contact records matching search criteria',
    icon: '🔍',
    color: 'sky'
  },
  'get_contact_opportunities': {
    name: 'get_contact_opportunities',
    displayName: 'Get Contact Opportunities',
    backend: 'salesforce',
    backendDisplay: 'Salesforce CRM',
    apiName: 'Salesforce REST API v58.0',
    apiEndpoint: 'sobjects/Opportunity',
    dataAccessed: 'Opportunities linked to contact',
    icon: '💰',
    color: 'sky'
  },
  'get_sales_pipeline': {
    name: 'get_sales_pipeline',
    displayName: 'Get Sales Pipeline',
    backend: 'salesforce',
    backendDisplay: 'Salesforce CRM',
    apiName: 'Salesforce REST API v58.0',
    apiEndpoint: 'sobjects/Opportunity/query',
    dataAccessed: 'Pipeline stages, deal values, forecasts',
    icon: '📊',
    color: 'sky'
  },
  'get_high_value_accounts': {
    name: 'get_high_value_accounts',
    displayName: 'Get High-Value Accounts',
    backend: 'salesforce',
    backendDisplay: 'Salesforce CRM',
    apiName: 'Salesforce REST API v58.0',
    apiEndpoint: 'sobjects/Account/query',
    dataAccessed: 'Top accounts by revenue/value',
    icon: '⭐',
    color: 'sky'
  },
  'create_salesforce_task': {
    name: 'create_salesforce_task',
    displayName: 'Create Task',
    backend: 'salesforce',
    backendDisplay: 'Salesforce CRM',
    apiName: 'Salesforce REST API v58.0',
    apiEndpoint: 'sobjects/Task/create',
    dataAccessed: 'New task created in CRM',
    icon: '✅',
    color: 'sky'
  },
  'create_salesforce_note': {
    name: 'create_salesforce_note',
    displayName: 'Create Note',
    backend: 'salesforce',
    backendDisplay: 'Salesforce CRM',
    apiName: 'Salesforce REST API v58.0',
    apiEndpoint: 'sobjects/Note/create',
    dataAccessed: 'New note attached to record',
    icon: '📝',
    color: 'sky'
  },
  'get_pipeline_value': {
    name: 'get_pipeline_value',
    displayName: 'Get Pipeline Value',
    backend: 'salesforce',
    backendDisplay: 'Salesforce CRM',
    apiName: 'Salesforce REST API v58.0',
    apiEndpoint: 'analytics/reports',
    dataAccessed: 'Total pipeline value, stage breakdown',
    icon: '💵',
    color: 'sky'
  },
  'update_opportunity_stage': {
    name: 'update_opportunity_stage',
    displayName: 'Update Opportunity Stage',
    backend: 'salesforce',
    backendDisplay: 'Salesforce CRM',
    apiName: 'Salesforce REST API v58.0',
    apiEndpoint: 'sobjects/Opportunity/update',
    dataAccessed: 'Opportunity stage updated',
    icon: '📈',
    color: 'sky'
  },
  
  // Internal MCP Tools (Wealth Portfolio)
  'get_portfolio_summary': {
    name: 'get_portfolio_summary',
    displayName: 'Get Portfolio Summary',
    backend: 'internal-mcp',
    backendDisplay: 'Internal MCP Server',
    apiName: 'Apex Wealth MCP',
    apiEndpoint: 'mcp://apex-wealth/portfolio',
    dataAccessed: 'Portfolio holdings, values, allocation',
    icon: '💼',
    color: 'emerald'
  },
  'get_client_info': {
    name: 'get_client_info',
    displayName: 'Get Client Info',
    backend: 'internal-mcp',
    backendDisplay: 'Internal MCP Server',
    apiName: 'Apex Wealth MCP',
    apiEndpoint: 'mcp://apex-wealth/client',
    dataAccessed: 'Client profile, preferences, risk tolerance',
    icon: '👤',
    color: 'emerald'
  },
  'process_payment': {
    name: 'process_payment',
    displayName: 'Process Payment',
    backend: 'internal-mcp',
    backendDisplay: 'Internal MCP Server',
    apiName: 'Apex Wealth MCP',
    apiEndpoint: 'mcp://apex-wealth/payment',
    dataAccessed: 'Payment transaction processed',
    icon: '💳',
    color: 'emerald'
  },
  'get_transactions': {
    name: 'get_transactions',
    displayName: 'Get Transactions',
    backend: 'internal-mcp',
    backendDisplay: 'Internal MCP Server',
    apiName: 'Apex Wealth MCP',
    apiEndpoint: 'mcp://apex-wealth/transactions',
    dataAccessed: 'Transaction history, amounts, dates',
    icon: '📋',
    color: 'emerald'
  },
  'get_recommendations': {
    name: 'get_recommendations',
    displayName: 'Get Recommendations',
    backend: 'internal-mcp',
    backendDisplay: 'Internal MCP Server',
    apiName: 'Apex Wealth MCP',
    apiEndpoint: 'mcp://apex-wealth/recommendations',
    dataAccessed: 'Investment recommendations',
    icon: '💡',
    color: 'emerald'
  }
};

// Helper to get tool metadata
function getToolMetadata(toolName: string): ToolMetadata | null {
  // Direct match
  if (TOOL_METADATA[toolName]) return TOOL_METADATA[toolName];
  
  // Try to find by partial match
  for (const [key, metadata] of Object.entries(TOOL_METADATA)) {
    if (toolName.includes(key) || key.includes(toolName)) {
      return metadata;
    }
  }
  
  return null;
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

function TokenCard({ title, token, color, stepNumber, icon, wasUsed, isOpaque, children }: { title: string; token?: string; color: string; stepNumber: number | string; icon?: string; wasUsed?: boolean; isOpaque?: boolean; children?: React.ReactNode }) {
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
                {/* Additional children content - FIRST (above Raw Token) */}
                {children}
                
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

// Business-focused JTBD mapping
const BUSINESS_JTBD: Record<string, { title: string; description: string; securityNote: string; icon: string }> = {
  'User Request': {
    title: 'Request Initiated',
    description: 'You asked the AI agent to help with a task',
    securityNote: 'Your request is processed securely within your session',
    icon: '💬'
  },
  'ID-JAG': {
    title: 'Identity Verified & Delegated',
    description: 'Your identity was securely passed to the AI agent',
    securityNote: 'Agent acts on your behalf with your permissions only',
    icon: '✓'
  },
  'MCP Auth': {
    title: 'Agent Authorized',
    description: 'Agent received limited, time-bound access',
    securityNote: 'Least-privilege access - only what\'s needed for this task',
    icon: '🔒'
  },
  'Vault': {
    title: 'Secure Connection Established',
    description: 'Your linked accounts accessed via secure vault',
    securityNote: 'Your credentials never exposed to AI - only secure tokens used',
    icon: '🔐'
  },
  'Google': {
    title: 'Calendar Access Granted',
    description: 'Retrieved your calendar data with your consent',
    securityNote: 'Read-only access to calendar you previously authorized',
    icon: '📅'
  },
  'Salesforce': {
    title: 'CRM Access Granted',
    description: 'Accessed Salesforce data with your consent',
    securityNote: 'Scoped to your Salesforce permissions',
    icon: '☁️'
  },
  'list_calendar': {
    title: 'Calendar Events Retrieved',
    description: 'Found your upcoming meetings and appointments',
    securityNote: 'Only retrieved events, no changes made',
    icon: '📋'
  },
  'create_calendar': {
    title: 'Calendar Event Created',
    description: 'Added a new event to your calendar',
    securityNote: 'Action logged and attributable to you',
    icon: '➕'
  },
  'search_salesforce': {
    title: 'Contacts Searched',
    description: 'Found matching contacts in your CRM',
    securityNote: 'Search scoped to your accessible records',
    icon: '🔍'
  },
  'get_contact': {
    title: 'Contact Details Retrieved',
    description: 'Fetched contact information from CRM',
    securityNote: 'Read-only access to contact record',
    icon: '👤'
  },
  'get_pipeline': {
    title: 'Pipeline Data Retrieved',
    description: 'Accessed your sales pipeline information',
    securityNote: 'Scoped to your team\'s pipeline visibility',
    icon: '📊'
  },
  'process_payment': {
    title: 'Payment Processed',
    description: 'Transaction initiated through secure channel',
    securityNote: 'Requires your authorization, fully audited',
    icon: '💳'
  },
  'get_portfolio': {
    title: 'Portfolio Retrieved',
    description: 'Accessed client portfolio information',
    securityNote: 'Read-only access within your authorization',
    icon: '💼'
  },
  'Tool': {
    title: 'Action Completed',
    description: 'Agent performed a task on your behalf',
    securityNote: 'All actions logged with your identity',
    icon: '⚡'
  }
};

function getBusinessInfo(step: string): { title: string; description: string; securityNote: string; icon: string } {
  // Check for specific tool names first
  if (step.includes('list_calendar')) return BUSINESS_JTBD['list_calendar'];
  if (step.includes('create_calendar')) return BUSINESS_JTBD['create_calendar'];
  if (step.includes('search_salesforce')) return BUSINESS_JTBD['search_salesforce'];
  if (step.includes('get_contact') || step.includes('get_opportunities')) return BUSINESS_JTBD['get_contact'];
  if (step.includes('get_pipeline') || step.includes('get_sales') || step.includes('get_high_value')) return BUSINESS_JTBD['get_pipeline'];
  if (step.includes('process_payment')) return BUSINESS_JTBD['process_payment'];
  if (step.includes('get_portfolio') || step.includes('get_client')) return BUSINESS_JTBD['get_portfolio'];
  
  // Then check for token exchange steps
  if (step.includes('User Request')) return BUSINESS_JTBD['User Request'];
  if (step.includes('ID-JAG')) return BUSINESS_JTBD['ID-JAG'];
  if (step.includes('MCP Auth')) return BUSINESS_JTBD['MCP Auth'];
  if (step.includes('Vault')) return BUSINESS_JTBD['Vault'];
  if (step.includes('Google') || step.includes('Calendar')) return BUSINESS_JTBD['Google'];
  if (step.includes('Salesforce')) return BUSINESS_JTBD['Salesforce'];
  if (step.includes('Tool:')) return BUSINESS_JTBD['Tool'];
  
  return { title: step, description: 'Processing...', securityNote: 'Secure operation', icon: '●' };
}

function AuditCard({ entry, xaaInfo, tokenVaultInfo }: { entry: AuditEntry; xaaInfo: any; tokenVaultInfo: any }) {
  const [expanded, setExpanded] = useState(false);
  
  const businessInfo = getBusinessInfo(entry.step);
  
  // Extract tool name from step (e.g., "Tool: list_calendar_events" -> "list_calendar_events")
  const toolName = entry.step.includes('Tool:') ? entry.step.replace('Tool: ', '').trim() : null;
  const toolMetadata = toolName ? getToolMetadata(toolName) : null;
  
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  // Determine backend type for coloring
  const getBackendColor = () => {
    if (toolMetadata?.backend === 'google-calendar') return 'border-rose-500/30 bg-rose-900/10';
    if (toolMetadata?.backend === 'salesforce') return 'border-sky-500/30 bg-sky-900/10';
    if (toolMetadata?.backend === 'internal-mcp') return 'border-emerald-500/30 bg-emerald-900/10';
    if (entry.status === 'success') return 'border-green-500/30 bg-slate-900/50';
    if (entry.status === 'error') return 'border-red-500/30 bg-red-900/10';
    return 'border-amber-500/30 bg-amber-900/10';
  };

  return (
    <div className={`rounded-lg border overflow-hidden ${getBackendColor()}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{toolMetadata?.icon || businessInfo.icon}</span>
          <div className="text-left">
            <span className="text-sm font-medium text-white block">
              {toolMetadata?.displayName || businessInfo.title}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">
              {toolMetadata ? toolMetadata.backendDisplay : businessInfo.description}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Backend badge */}
          {toolMetadata && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
              toolMetadata.backend === 'google-calendar' ? 'bg-rose-500/20 text-rose-400' :
              toolMetadata.backend === 'salesforce' ? 'bg-sky-500/20 text-sky-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {toolMetadata.backend === 'internal-mcp' ? 'Internal MCP' : 
               toolMetadata.backend === 'google-calendar' ? 'External SaaS' : 
               'External SaaS'}
            </span>
          )}
          <span className={`w-2 h-2 rounded-full ${
            entry.status === 'success' ? 'bg-green-500' :
            entry.status === 'error' ? 'bg-red-500' :
            'bg-amber-500 animate-pulse'
          }`}></span>
          <span className="text-xs text-slate-500">{formatTime(entry.timestamp)}</span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-800 space-y-2">
          {/* Tool Details - shown for tool calls */}
          {toolMetadata && (
            <div className="mt-2 bg-slate-800/50 rounded p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-16">Tool:</span>
                <span className="text-xs text-white font-mono">{toolMetadata.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-16">Backend:</span>
                <span className={`text-xs font-medium ${
                  toolMetadata.backend === 'google-calendar' ? 'text-rose-400' :
                  toolMetadata.backend === 'salesforce' ? 'text-sky-400' :
                  'text-emerald-400'
                }`}>{toolMetadata.backendDisplay}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-16">API:</span>
                <span className="text-xs text-slate-300">{toolMetadata.apiName}</span>
              </div>
              {toolMetadata.apiEndpoint && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-16">Endpoint:</span>
                  <span className="text-xs text-slate-400 font-mono">{toolMetadata.apiEndpoint}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-slate-500 w-16">Data:</span>
                <span className="text-xs text-slate-300">{toolMetadata.dataAccessed}</span>
              </div>
              {entry.details?.recordCount !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-16">Records:</span>
                  <span className="text-xs text-green-400 font-medium">{entry.details.recordCount} returned</span>
                </div>
              )}
            </div>
          )}
          
          {/* Security assurance */}
          <div className="bg-green-900/20 rounded p-2 border border-green-500/20">
            <div className="flex items-start gap-2">
              <span className="text-green-400">🛡️</span>
              <p className="text-xs text-green-300">{businessInfo.securityNote}</p>
            </div>
          </div>
          
          {/* Technical details toggle - for non-tool entries */}
          {!toolMetadata && (
            <details className="mt-1">
              <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-400">
                Technical details
              </summary>
              <div className="mt-1 bg-slate-800/50 rounded p-2 text-[10px] font-mono text-slate-400">
                <p>Step: {entry.step}</p>
                {entry.details?.expiresIn && <p>TTL: {entry.details.expiresIn}s</p>}
                {entry.details?.connection && <p>Connection: {entry.details.connection}</p>}
                {entry.details?.tokenType && <p>Type: {entry.details.tokenType}</p>}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// Log Entry component for Logs view - expandable on double-click
function LogEntry({ entry, xaaInfo, tokenVaultInfo, session }: { entry: AuditEntry; xaaInfo: any; tokenVaultInfo: any; session?: any }) {
  const [expanded, setExpanded] = useState(false);
  
  const businessInfo = getBusinessInfo(entry.step);
  
  // Extract tool name and get metadata
  const toolName = entry.step.includes('Tool:') ? entry.step.replace('Tool: ', '').trim() : null;
  const toolMetadata = toolName ? getToolMetadata(toolName) : null;
  
  // Decode tokens to get identity info
  const idJagDecoded = xaaInfo?.id_jag_token ? decodeJWT(xaaInfo.id_jag_token) : null;
  const mcpDecoded = xaaInfo?.mcp_token ? decodeJWT(xaaInfo.mcp_token) : null;
  const vaultDecoded = tokenVaultInfo?.vault_token ? decodeJWT(tokenVaultInfo.vault_token) : null;
  
  // Extract identity information
  const userEmail = mcpDecoded?.sub || session?.user?.email || 'Unknown User';
  const userId = idJagDecoded?.sub || mcpDecoded?.uid || 'Unknown';
  const agentId = idJagDecoded?.client_id || xaaInfo?.agent_id || 'wlpt6vqrvo3HfiGZu1d7';
  const federatedId = vaultDecoded?.sub || null;
  
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  // Get border color based on backend
  const getBorderColor = () => {
    if (toolMetadata?.backend === 'google-calendar') return 'border-rose-500/50';
    if (toolMetadata?.backend === 'salesforce') return 'border-sky-500/50';
    if (toolMetadata?.backend === 'internal-mcp') return 'border-emerald-500/50';
    return 'border-green-500/50';
  };
  
  return (
    <div className={`border-l-2 border-slate-800 hover:${getBorderColor()} transition-colors`}>
      <div 
        className="flex items-start gap-2 py-1.5 px-3 hover:bg-slate-800/30 cursor-pointer select-none"
        onDoubleClick={() => setExpanded(!expanded)}
      >
        <span className="text-slate-600 w-20 flex-shrink-0 tabular-nums text-xs">{formatTime(entry.timestamp)}</span>
        <span className="text-base flex-shrink-0">{toolMetadata?.icon || businessInfo.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-white">{toolMetadata?.displayName || businessInfo.title}</span>
          {toolMetadata && (
            <span className={`text-xs ml-2 ${
              toolMetadata.backend === 'google-calendar' ? 'text-rose-400' :
              toolMetadata.backend === 'salesforce' ? 'text-sky-400' :
              'text-emerald-400'
            }`}>
              → {toolMetadata.backendDisplay}
            </span>
          )}
          {!toolMetadata && (
            <span className="text-xs text-slate-500 ml-2">{businessInfo.description}</span>
          )}
        </div>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
          entry.status === 'success' ? 'bg-green-500' :
          entry.status === 'error' ? 'bg-red-500' :
          'bg-amber-500'
        }`}></span>
      </div>
      
      {expanded && (
        <div className={`pl-24 pr-3 pb-2 text-xs bg-slate-900/50 border-l-2 ${getBorderColor()}`}>
          <div className="py-2 space-y-2">
            {/* Identity Context */}
            <div className="bg-slate-800/70 rounded p-2 space-y-1">
              <div className="text-[10px] font-medium text-slate-400 mb-1.5">Identity Chain</div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-500">👤 User:</span>
                <span className="text-cyan-400">{userEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-500">🆔 User ID:</span>
                <span className="text-slate-300 font-mono">{userId.length > 20 ? `${userId.substring(0, 20)}...` : userId}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-500">🤖 Agent:</span>
                <span className="text-amber-400 font-mono">{agentId}</span>
              </div>
              {federatedId && (
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-500">🔗 Federated:</span>
                  <span className="text-purple-400 font-mono text-[9px]">{federatedId}</span>
                </div>
              )}
              {/* Show delegation chain for tool calls */}
              {toolMetadata && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-700">
                  <div className="text-[9px] text-slate-500">
                    Delegation: <span className="text-cyan-400">{userEmail}</span>
                    <span className="text-slate-600"> → </span>
                    <span className="text-amber-400">Agent</span>
                    <span className="text-slate-600"> → </span>
                    <span className={
                      toolMetadata.backend === 'google-calendar' ? 'text-rose-400' :
                      toolMetadata.backend === 'salesforce' ? 'text-sky-400' :
                      'text-emerald-400'
                    }>{toolMetadata.backendDisplay}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Tool details */}
            {toolMetadata && (
              <div className="bg-slate-800/50 rounded p-2 space-y-1">
                <div className="text-[10px]">
                  <span className="text-slate-500">API: </span>
                  <span className="text-slate-300">{toolMetadata.apiName}</span>
                </div>
                {toolMetadata.apiEndpoint && (
                  <div className="text-[10px]">
                    <span className="text-slate-500">Endpoint: </span>
                    <span className="text-slate-400 font-mono">{toolMetadata.apiEndpoint}</span>
                  </div>
                )}
                <div className="text-[10px]">
                  <span className="text-slate-500">Data: </span>
                  <span className="text-slate-300">{toolMetadata.dataAccessed}</span>
                </div>
              </div>
            )}
            
            {/* Security note */}
            <div className="flex items-start gap-2">
              <span className="text-green-400">🛡️</span>
              <span className="text-green-300 text-[11px]">{businessInfo.securityNote}</span>
            </div>
          </div>
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
      <div className="h-full grid grid-cols-5 gap-4">
        {/* LEFT: Token Flow - 60% (3 cols) */}
        <div className="col-span-3 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">🔐 Token Flow</h2>
            <p className="text-sm text-slate-500">View decoded tokens at each step</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Active Flow Indicator - Shows which flow is being used for current request */}
            {toolsCalled.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚡</span>
                  <span className="text-sm font-semibold text-white">Active Security Flow</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {toolsCalled.some(t => !CALENDAR_TOOLS.includes(t) && !SALESFORCE_TOOLS.includes(t)) && (
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/30">
                      ✓ Okta XAA → MCP Server
                    </span>
                  )}
                  {usedCalendar && (
                    <span className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded-full text-xs font-medium border border-rose-500/30">
                      ✓ Token Vault → Google Calendar
                    </span>
                  )}
                  {usedSalesforce && (
                    <span className="px-2 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs font-medium border border-sky-500/30">
                      ✓ Token Vault → Salesforce
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Okta ID Token */}
            {/* Dim if ONLY Token Vault tools were used (no MCP tools) */}
            <div className={`${(usedCalendar || usedSalesforce) && !toolsCalled.some(t => !CALENDAR_TOOLS.includes(t) && !SALESFORCE_TOOLS.includes(t)) ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Step 1</span>
                <span className="text-sm text-slate-400">User Authentication</span>
                <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">OpenID Connect</span>
              </div>
              <TokenCard 
                title="Okta ID Token" 
                token={(session as any)?.idToken} 
                color="border-blue-500/30 bg-blue-900/10" 
                stepNumber={1}
                icon="🔐"
              >
                {/* One-liner */}
                <div className="mb-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded">
                  <p className="text-xs text-amber-400">💡 "User proves their identity to Okta"</p>
                </div>
                {/* OIDC Authentication Flow */}
                {(session as any)?.idToken && (
                  <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-900/10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-blue-400 text-xs">●</span>
                      <span className="text-xs font-semibold text-blue-400">OpenID Connect Flow</span>
                    </div>
                    
                    <div className="space-y-0">
                      {/* Sub-step 1 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center font-bold">1</div>
                          <div className="w-0.5 h-4 bg-blue-500/30"></div>
                        </div>
                        <div className="pb-1">
                          <p className="text-[10px] font-medium text-white">User Authentication</p>
                          <p className="text-[8px] text-slate-400">Enter credentials + MFA verification</p>
                        </div>
                      </div>
                      
                      {/* Sub-step 2 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center font-bold">2</div>
                          <div className="w-0.5 h-4 bg-blue-500/30"></div>
                        </div>
                        <div className="pb-1">
                          <p className="text-[10px] font-medium text-white">Identity Validation</p>
                          <p className="text-[8px] text-slate-400">Okta validates user identity and session</p>
                        </div>
                      </div>
                      
                      {/* Sub-step 3 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center font-bold">3</div>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-white">ID Token Issued</p>
                          <p className="text-[8px] text-slate-400">JWT signed by Okta with user claims</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TokenCard>
            </div>

            {/* Step 2: ID-JAG Token */}
            {/* Dim if ONLY Token Vault tools were used (no MCP tools) */}
            <div className={`${(usedCalendar || usedSalesforce) && !toolsCalled.some(t => !CALENDAR_TOOLS.includes(t) && !SALESFORCE_TOOLS.includes(t)) ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded">Step 2</span>
                <span className="text-sm text-slate-400">XAA Exchange (Identity Assertion)</span>
                <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">RFC 8693</span>
              </div>
              <TokenCard 
                title="ID-JAG Token" 
                token={xaaInfo?.id_jag_token} 
                color="border-indigo-500/30 bg-indigo-900/10" 
                stepNumber={2}
                icon="🔑"
              >
                {/* One-liner */}
                <div className="mb-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded">
                  <p className="text-sm text-amber-400">💡 "Okta vouches for the user to other systems"</p>
                </div>
                {/* ID-JAG Secure Flow - Inside TokenCard expansion */}
                {(xaaInfo?.token_obtained || xaaInfo?.id_jag_token) && (
                  <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-900/10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-cyan-400 text-xs">●</span>
                      <span className="text-xs font-semibold text-cyan-400">Token Exchange Flow (RFC 8693)</span>
                    </div>
                    
                    <div className="space-y-0">
                      {/* Sub-step 1 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-cyan-500 text-white text-[8px] flex items-center justify-center font-bold">1</div>
                          <div className="w-0.5 h-4 bg-cyan-500/30"></div>
                        </div>
                        <div className="pb-1">
                          <p className="text-[10px] font-medium text-white">ID Token → Token Exchange</p>
                          <p className="text-[8px] text-slate-400">Submit ID token with requested_token_type: id-jag</p>
                        </div>
                      </div>
                      
                      {/* Sub-step 2 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-cyan-500 text-white text-[8px] flex items-center justify-center font-bold">2</div>
                          <div className="w-0.5 h-4 bg-cyan-500/30"></div>
                        </div>
                        <div className="pb-1">
                          <p className="text-[10px] font-medium text-white">Policy Evaluation</p>
                          <p className="text-[8px] text-slate-400">Okta validates user, app, and cross-app access policy</p>
                        </div>
                      </div>
                      
                      {/* Sub-step 3 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-cyan-500 text-white text-[8px] flex items-center justify-center font-bold">3</div>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-white">ID-JAG Issued</p>
                          <p className="text-[8px] text-slate-400">Identity assertion JWT signed by Okta</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Reference link */}
                    <div className="mt-2 pt-2 border-t border-cyan-500/20">
                      <a href="https://datatracker.ietf.org/doc/draft-parecki-oauth-identity-assertion-authz-grant/" target="_blank" rel="noopener noreferrer" className="text-[9px] text-cyan-400 hover:underline">
                        → Identity Assertion Authorization Grant (Aaron Parecki)
                      </a>
                    </div>
                  </div>
                )}
              </TokenCard>
            </div>

            {/* Step 3: Auth Server Token */}
            {/* Dim if ONLY Token Vault tools were used (no MCP tools) */}
            <div className={`${(usedCalendar || usedSalesforce) && !toolsCalled.some(t => !CALENDAR_TOOLS.includes(t) && !SALESFORCE_TOOLS.includes(t)) ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Step 3</span>
                <span className="text-sm text-slate-400">Access Grant</span>
                <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">RFC 7523</span>
              </div>
              <TokenCard 
                title="Auth Server Token" 
                token={xaaInfo?.mcp_token} 
                color="border-green-500/30 bg-green-900/10" 
                stepNumber={3}
                icon="🎫"
              >
                {/* One-liner */}
                <div className="mb-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded">
                  <p className="text-sm text-amber-400">💡 "User gets permission to access a specific resource"</p>
                </div>
                {/* JWT Bearer Grant Flow */}
                {xaaInfo?.mcp_token && (
                  <div className="p-3 rounded-lg border border-green-500/30 bg-green-900/10 mb-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-green-400 text-sm">●</span>
                      <span className="text-sm font-semibold text-green-400">JWT Bearer Grant Flow (RFC 7523)</span>
                    </div>
                    
                    <div className="space-y-0">
                      {/* Sub-step 1 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-green-500 text-white text-[8px] flex items-center justify-center font-bold">1</div>
                          <div className="w-0.5 h-4 bg-green-500/30"></div>
                        </div>
                        <div className="pb-1">
                          <p className="text-[10px] font-medium text-white">ID-JAG → JWT Bearer Grant</p>
                          <p className="text-[8px] text-slate-400">Submit ID-JAG as assertion to auth server</p>
                        </div>
                      </div>
                      
                      {/* Sub-step 2 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-green-500 text-white text-[8px] flex items-center justify-center font-bold">2</div>
                          <div className="w-0.5 h-4 bg-green-500/30"></div>
                        </div>
                        <div className="pb-1">
                          <p className="text-[10px] font-medium text-white">Signature & Policy Validation</p>
                          <p className="text-[8px] text-slate-400">Auth server validates ID-JAG signature and access policy</p>
                        </div>
                      </div>
                      
                      {/* Sub-step 3 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-green-500 text-white text-[8px] flex items-center justify-center font-bold">3</div>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-white">Access Token Issued</p>
                          <p className="text-[8px] text-slate-400">Token with target audience and scopes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Audience info - Show ALL audiences based on tools called */}
                {xaaInfo?.mcp_token && (
                  <div className="mb-2 p-2 bg-slate-800/50 rounded border border-slate-700">
                    <div className="flex items-start gap-2 text-[10px]">
                      <span className="text-slate-500 pt-0.5">Audience:</span>
                      <div className="flex flex-wrap gap-1">
                        {/* MCP audience - if any MCP tools were used */}
                        {toolsCalled.some(t => !CALENDAR_TOOLS.includes(t) && !SALESFORCE_TOOLS.includes(t)) && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-mono">apex-wealth-mcp</span>
                        )}
                        {/* Salesforce audience */}
                        {usedSalesforce && (
                          <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-400 rounded font-mono">https://salesforce.com</span>
                        )}
                        {/* Google audience */}
                        {usedCalendar && (
                          <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 rounded font-mono">https://google.com</span>
                        )}
                        {/* Fallback if no tools called */}
                        {toolsCalled.length === 0 && (
                          <span className="text-slate-400">Varies by target resource</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] mt-1">
                      <span className="text-slate-500">Grant:</span>
                      <span className="text-slate-300">JWT Bearer (urn:ietf:params:oauth:grant-type:jwt-bearer)</span>
                    </div>
                  </div>
                )}
              </TokenCard>
              
              {/* Divergence Point */}
              {xaaInfo?.mcp_token && (
                <div className="mt-2 p-2 rounded-lg bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">⚡</span>
                    <span className="text-xs font-medium text-purple-300">Flow Divergence Point</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {!usedCalendar && !usedSalesforce && toolsCalled.length > 0 ? (
                      <span className="text-green-400">→ MCP Only: Steps 4 & 5 skipped. Token goes directly to MCP server.</span>
                    ) : (usedCalendar || usedSalesforce) ? (
                      <span className="text-purple-300">→ External Services: Continue to Token Vault (Steps 4 & 5)</span>
                    ) : (
                      <span>→ MCP: Direct to server | External: Continue to Token Vault</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Auth0 Vault Token */}
            <div className={`${!usedCalendar && !usedSalesforce && toolsCalled.length > 0 ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Step 4</span>
                <span className="text-sm text-slate-400">Token Vault Access</span>
                <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">Custom Token Exchange</span>
                {!usedCalendar && !usedSalesforce && toolsCalled.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 bg-slate-600 text-slate-400 rounded">Skipped</span>
                )}
              </div>
              <TokenCard 
                title="Vault Access Token (CTE)" 
                token={tokenVaultInfo?.vault_token} 
                color="border-purple-500/30 bg-purple-900/10" 
                stepNumber={4}
                icon="🏦"
              >
                {/* One-liner */}
                <div className="mb-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded">
                  <p className="text-sm text-amber-400">💡 "User gets access to the secure token vault"</p>
                </div>
                {/* CTE Flow */}
                {tokenVaultInfo?.vault_token && (
                  <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-900/10 mb-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-purple-400 text-sm">●</span>
                      <span className="text-sm font-semibold text-purple-400">Custom Token Exchange Flow (Auth0)</span>
                    </div>
                    
                    <div className="space-y-0">
                      {/* Sub-step 1 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-purple-500 text-white text-[8px] flex items-center justify-center font-bold">1</div>
                          <div className="w-0.5 h-4 bg-purple-500/30"></div>
                        </div>
                        <div className="pb-1">
                          <p className="text-[10px] font-medium text-white">Auth Server Token → Auth0 CTE</p>
                          <p className="text-[8px] text-slate-400">Submit Okta token as subject_token</p>
                        </div>
                      </div>
                      
                      {/* Sub-step 2 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-purple-500 text-white text-[8px] flex items-center justify-center font-bold">2</div>
                          <div className="w-0.5 h-4 bg-purple-500/30"></div>
                        </div>
                        <div className="pb-1">
                          <p className="text-[10px] font-medium text-white">Validate Okta Token</p>
                          <p className="text-[8px] text-slate-400">Auth0 CTE Action validates signature and claims</p>
                        </div>
                      </div>
                      
                      {/* Sub-step 3 */}
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-purple-500 text-white text-[8px] flex items-center justify-center font-bold">3</div>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-white">Vault Access Token Issued</p>
                          <p className="text-[8px] text-slate-400">Token with connection claim for vault lookup</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* CTE Info */}
                {tokenVaultInfo?.vault_token && (
                  <div className="mb-2 p-2 bg-slate-800/50 rounded border border-slate-700">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-500">Audience:</span>
                      <span className="text-purple-400 font-mono">https://vault.dell.auth101.dev</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] mt-1">
                      <span className="text-slate-500">Scope:</span>
                      <span className="text-slate-300">read:vault</span>
                    </div>
                  </div>
                )}
                {/* Reference link */}
                <div className="mt-2 pt-2 border-t border-purple-500/20">
                  <a href="https://auth0.com/docs/authenticate/custom-token-exchange" target="_blank" rel="noopener noreferrer" className="text-[9px] text-purple-400 hover:underline">
                    → Auth0 Custom Token Exchange Docs
                  </a>
                </div>
              </TokenCard>
            </div>

            {/* Step 5: Federated Tokens - DYNAMIC based on tools called */}
            <div className={`${!usedCalendar && !usedSalesforce && toolsCalled.length > 0 ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">Step 5</span>
                <span className="text-sm text-slate-400">Federated Connection Token (External Service)</span>
                {!usedCalendar && !usedSalesforce && toolsCalled.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 bg-slate-600 text-slate-400 rounded">Skipped</span>
                )}
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
                  >
                    {/* One-liner */}
                    <div className="mb-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded">
                      <p className="text-sm text-amber-400">💡 "User retrieves their stored 3rd-party credentials"</p>
                    </div>
                    {/* Federated Token Flow */}
                    <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-900/10 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-rose-400 text-sm">●</span>
                        <span className="text-xs font-semibold text-rose-400">Token Vault Federated Exchange</span>
                      </div>
                      
                      <div className="space-y-0">
                        {/* Sub-step 1 */}
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center font-bold">1</div>
                            <div className="w-0.5 h-4 bg-rose-500/30"></div>
                          </div>
                          <div className="pb-1">
                            <p className="text-[10px] font-medium text-white">Vault Token → Token Vault API</p>
                            <p className="text-[8px] text-slate-400">Request federated token with connection ID</p>
                          </div>
                        </div>
                        
                        {/* Sub-step 2 */}
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center font-bold">2</div>
                            <div className="w-0.5 h-4 bg-rose-500/30"></div>
                          </div>
                          <div className="pb-1">
                            <p className="text-[10px] font-medium text-white">Lookup Linked Account</p>
                            <p className="text-[8px] text-slate-400">Find user's stored Google OAuth connection</p>
                          </div>
                        </div>
                        
                        {/* Sub-step 3 */}
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center font-bold">3</div>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-white">3rd Party Token Retrieved</p>
                            <p className="text-[8px] text-slate-400">Fresh Google access token returned</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Reference link */}
                    <div className="mt-2 pt-2 border-t border-rose-500/20">
                      <a href="https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault/access-token-exchange-with-token-vault" target="_blank" rel="noopener noreferrer" className="text-[9px] text-rose-400 hover:underline">
                        → Auth0 Token Vault Federated Exchange
                      </a>
                    </div>
                  </TokenCard>
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
                  >
                    {/* One-liner */}
                    <div className="mb-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded">
                      <p className="text-xs text-amber-400">💡 "User retrieves their stored 3rd-party credentials"</p>
                    </div>
                    {/* Federated Token Flow */}
                    <div className="p-3 rounded-lg border border-sky-500/30 bg-sky-900/10 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sky-400 text-xs">●</span>
                        <span className="text-xs font-semibold text-sky-400">Token Vault Federated Exchange</span>
                      </div>
                      
                      <div className="space-y-0">
                        {/* Sub-step 1 */}
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-sky-500 text-white text-[8px] flex items-center justify-center font-bold">1</div>
                            <div className="w-0.5 h-4 bg-sky-500/30"></div>
                          </div>
                          <div className="pb-1">
                            <p className="text-[10px] font-medium text-white">Vault Token → Token Vault API</p>
                            <p className="text-[8px] text-slate-400">Request federated token with connection ID</p>
                          </div>
                        </div>
                        
                        {/* Sub-step 2 */}
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-sky-500 text-white text-[8px] flex items-center justify-center font-bold">2</div>
                            <div className="w-0.5 h-4 bg-sky-500/30"></div>
                          </div>
                          <div className="pb-1">
                            <p className="text-[10px] font-medium text-white">Lookup Linked Account</p>
                            <p className="text-[8px] text-slate-400">Find user's stored Salesforce connection</p>
                          </div>
                        </div>
                        
                        {/* Sub-step 3 */}
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-sky-500 text-white text-[8px] flex items-center justify-center font-bold">3</div>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-white">3rd Party Token Retrieved</p>
                            <p className="text-[8px] text-slate-400">Fresh Salesforce access token returned</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Reference link */}
                    <div className="mt-2 pt-2 border-t border-sky-500/20">
                      <a href="https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault/access-token-exchange-with-token-vault" target="_blank" rel="noopener noreferrer" className="text-[9px] text-sky-400 hover:underline">
                        → Auth0 Token Vault Federated Exchange
                      </a>
                    </div>
                  </TokenCard>
                </div>
              )}
              
              {/* Show Internal MCP message if only internal tools were used */}
              {!usedCalendar && !usedSalesforce && toolsCalled.length > 0 && (
                <div className="p-3 rounded-lg border border-slate-600 bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <span>🔧</span>
                    <span className="text-sm text-slate-400 font-medium">Internal MCP Only</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">No federated token needed - Auth Server Token (Step 3) used directly with MCP server via Okta XAA flow.</p>
                </div>
              )}
              
              {/* Fallback if no tools called yet */}
              {toolsCalled.length === 0 && (
                <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                  <span className="text-xs text-slate-500">Make a request to see federated tokens</span>
                </div>
              )}
            </div>
            
            {/* Security Badge */}
          </div>
        </div>

        {/* RIGHT: Audit Trail - Business Focused - 40% (2 cols) */}
        <div className="col-span-2 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">🛡️ What Happened</h2>
              <p className="text-sm text-slate-500">Secure actions on your behalf</p>
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
            {/* Tool Execution Summary - At top of right column */}
            {toolsCalled.length > 0 && (
              <div className="mb-4">
                <div className="rounded-lg border border-slate-600 bg-slate-800/50 overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-purple-400">⚡</span>
                      <span className="text-sm font-medium text-white">Tool Execution</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">MCP Protocol</span>
                      <span className="text-green-400 text-xs ml-auto">✓ Complete</span>
                    </div>
                    
                    {/* MCP Servers - Show ALL that were used */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs text-slate-500 w-14 pt-1">Servers</span>
                      <div className="flex flex-wrap gap-1">
                        {toolsCalled.some(t => !CALENDAR_TOOLS.includes(t) && !SALESFORCE_TOOLS.includes(t)) && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-900/30 rounded border border-emerald-500/30">
                            <span className="text-emerald-400 text-xs">🏢</span>
                            <span className="text-[10px] text-emerald-300 font-medium">Apex Wealth MCP</span>
                          </div>
                        )}
                        {toolsCalled.some(t => SALESFORCE_TOOLS.includes(t)) && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-sky-900/30 rounded border border-sky-500/30">
                            <span className="text-sky-400 text-xs">☁️</span>
                            <span className="text-[10px] text-sky-300 font-medium">Salesforce CRM</span>
                          </div>
                        )}
                        {toolsCalled.some(t => CALENDAR_TOOLS.includes(t)) && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-rose-900/30 rounded border border-rose-500/30">
                            <span className="text-rose-400 text-xs">📅</span>
                            <span className="text-[10px] text-rose-300 font-medium">Google Calendar</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Tools Executed */}
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-slate-500 w-14 pt-1">Tools</span>
                      <div className="flex flex-wrap gap-1">
                        {toolsCalled.map((tool, i) => (
                          <span 
                            key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              CALENDAR_TOOLS.includes(tool) ? 'bg-rose-500/20 text-rose-400' :
                              SALESFORCE_TOOLS.includes(tool) ? 'bg-sky-500/20 text-sky-400' :
                              'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expandable details */}
                  <details className="border-t border-slate-700">
                    <summary className="px-3 py-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300 bg-slate-800/50">
                      View execution details
                    </summary>
                    <div className="px-3 pb-3 bg-slate-800/50">
                      <div className="text-[10px] text-slate-400 space-y-1">
                        <p>• Token validated by MCP server</p>
                        <p>• Scopes verified: mcp:read</p>
                        <p>• User identity: {session?.user?.email || 'Authenticated user'}</p>
                        <p>• Access level: User-delegated permissions</p>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            )}
            
            {displayEvents.length === 0 && toolsCalled.length === 0 ? (
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
              <div className="font-mono text-xs">
                {displayEvents.map((entry, index) => (
                  <LogEntry key={entry.id} entry={entry} xaaInfo={xaaInfo} tokenVaultInfo={tokenVaultInfo} session={session} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
