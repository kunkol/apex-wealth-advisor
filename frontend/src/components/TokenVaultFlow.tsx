'use client';

import { useState } from 'react';

interface TokenVaultFlowProps {
  tokenVaultInfo: any;
  isActive: boolean;
  toolsCalled?: string[];
}

// Helper to detect which tools use which backend
const CALENDAR_TOOLS = ['list_calendar_events', 'get_calendar_event', 'create_calendar_event', 'check_availability', 'cancel_calendar_event'];
const SALESFORCE_TOOLS = ['search_salesforce_contacts', 'get_contact_opportunities', 'get_sales_pipeline', 'get_high_value_accounts', 'create_salesforce_task', 'create_salesforce_note', 'get_pipeline_value', 'update_opportunity_stage'];

export default function TokenVaultFlow({ tokenVaultInfo, isActive, toolsCalled = [] }: TokenVaultFlowProps) {
  const [expanded, setExpanded] = useState(false);

  // Determine which tokens were used
  const usedCalendar = toolsCalled.some(t => CALENDAR_TOOLS.includes(t));
  const usedSalesforce = toolsCalled.some(t => SALESFORCE_TOOLS.includes(t));
  
  const hasGoogleToken = tokenVaultInfo?.google_token;
  const hasSalesforceToken = tokenVaultInfo?.salesforce_token;
  const hasVaultToken = tokenVaultInfo?.vault_token;

  const truncateToken = (token: string) => {
    if (!token) return 'Not available';
    return `${token.slice(0, 15)}...${token.slice(-8)}`;
  };

  // Determine the title based on what was used
  const getTitle = () => {
    if (usedSalesforce && usedCalendar) return 'Token Vault (Multi)';
    if (usedSalesforce) return 'Token Vault (Salesforce)';
    if (usedCalendar) return 'Token Vault (Calendar)';
    return 'Token Vault';
  };

  // Determine the icon
  const getIcon = () => {
    if (usedSalesforce && usedCalendar) return '🔄';
    if (usedSalesforce) return '☁️';
    if (usedCalendar) return '📅';
    return '🏦';
  };

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isActive 
        ? usedSalesforce 
          ? 'border-sky-500/50 bg-sky-900/20' 
          : 'border-rose-500/50 bg-rose-900/20'
        : 'border-slate-700 bg-slate-800/50'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getIcon()}</span>
          <div className="text-left">
            <p className="text-sm font-medium text-white">{getTitle()}</p>
            <p className="text-[10px] text-slate-500">Auth0 Federated Access</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <span className={`text-xs px-2 py-0.5 rounded ${
              usedSalesforce ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              ✓ Active
            </span>
          ) : hasVaultToken ? (
            <span className="text-xs text-green-400">✓ Ready</span>
          ) : (
            <span className="text-xs text-slate-500">Pending</span>
          )}
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-700 space-y-2">
          {/* Vault Token */}
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Vault Token</span>
              {hasVaultToken && <span className="text-xs text-green-400">✓</span>}
            </div>
            <code className="text-[10px] text-slate-400 font-mono">
              {truncateToken(tokenVaultInfo?.vault_token)}
            </code>
          </div>

          {/* Google Token - Show if calendar tools used or token exists */}
          {(usedCalendar || hasGoogleToken) && (
            <div className="p-2 rounded bg-rose-900/20 border border-rose-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-rose-400 flex items-center gap-1">
                  📅 Google Calendar
                </span>
                {hasGoogleToken && <span className="text-xs text-green-400">✓</span>}
              </div>
              <code className="text-[10px] text-slate-400 font-mono">
                {truncateToken(tokenVaultInfo?.google_token)}
              </code>
              {tokenVaultInfo?.google_expires_in && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Expires: {tokenVaultInfo.google_expires_in}s
                </p>
              )}
            </div>
          )}

          {/* Salesforce Token - Show if salesforce tools used or token exists */}
          {(usedSalesforce || hasSalesforceToken) && (
            <div className="p-2 rounded bg-sky-900/20 border border-sky-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-sky-400 flex items-center gap-1">
                  ☁️ Salesforce CRM
                </span>
                {hasSalesforceToken && <span className="text-xs text-green-400">✓</span>}
              </div>
              <code className="text-[10px] text-slate-400 font-mono">
                {truncateToken(tokenVaultInfo?.salesforce_token)}
              </code>
              {tokenVaultInfo?.salesforce_expires_in && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Expires: {tokenVaultInfo.salesforce_expires_in}s
                </p>
              )}
            </div>
          )}

          {/* Connection Info */}
          <div className="pt-2 border-t border-slate-700">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span>Connection:</span>
              {(usedCalendar || hasGoogleToken) && (
                <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 rounded">google-oauth2</span>
              )}
              {(usedSalesforce || hasSalesforceToken) && (
                <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-400 rounded">salesforce</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
