'use client';

import { useState } from 'react';

interface XAAFlowCardProps {
  xaaInfo?: {
    configured?: boolean;
    token_obtained?: boolean;
    id_jag_token?: string;
    mcp_token?: string;
    id_jag_expires_in?: number;
    mcp_token_expires_in?: number;
    scope?: string;
  };
  tokenVaultInfo?: {
    configured?: boolean;
    google_token_obtained?: boolean;
    salesforce_token_obtained?: boolean;
    vault_token?: string;
    google_token?: string;
    salesforce_token?: string;
    google_expires_in?: number;
    salesforce_expires_in?: number;
  };
  toolsCalled?: string[];
}

export default function XAAFlowCard({ xaaInfo, tokenVaultInfo, toolsCalled = [] }: XAAFlowCardProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Determine which flows were used based on tools called
  const usedXAA = toolsCalled.some(t => 
    ['get_client', 'list_clients', 'get_portfolio', 'process_payment', 'update_client'].includes(t)
  );
  const usedCalendar = toolsCalled.some(t => 
    ['list_calendar_events', 'get_calendar_event', 'create_calendar_event', 'check_availability', 'cancel_calendar_event'].includes(t)
  );
  const usedSalesforce = toolsCalled.some(t => 
    ['search_salesforce_contacts', 'get_contact_opportunities', 'get_sales_pipeline', 'get_high_value_accounts', 
     'create_salesforce_task', 'create_salesforce_note', 'get_pipeline_value', 'update_opportunity_stage'].includes(t)
  );

  const truncateToken = (token?: string) => {
    if (!token) return 'Not available';
    return `${token.slice(0, 20)}...${token.slice(-10)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Define all steps
  const steps = [
    {
      step: 1,
      title: 'Okta ID Token',
      subtitle: 'Okta Authentication',
      status: xaaInfo?.configured ? 'completed' : 'pending',
      icon: '🔐',
      color: 'blue',
    },
    {
      step: 2,
      title: 'ID-JAG Token',
      subtitle: 'XAA Exchange (ID-JAG)',
      status: xaaInfo?.token_obtained ? 'completed' : 'pending',
      token: xaaInfo?.id_jag_token,
      expiresIn: xaaInfo?.id_jag_expires_in,
      icon: '🔑',
      color: 'purple',
    },
    {
      step: 3,
      title: 'MCP Token',
      subtitle: 'Auth Server Token',
      status: xaaInfo?.mcp_token ? 'completed' : 'pending',
      token: xaaInfo?.mcp_token,
      expiresIn: xaaInfo?.mcp_token_expires_in,
      scope: xaaInfo?.scope,
      icon: '🎫',
      color: 'green',
    },
    {
      step: 4,
      title: 'Auth0 Vault Token',
      subtitle: 'Token Vault Exchange',
      status: tokenVaultInfo?.vault_token ? 'completed' : 'pending',
      token: tokenVaultInfo?.vault_token,
      icon: '🏦',
      color: 'amber',
    },
    {
      step: 5,
      title: 'Federated Token',
      subtitle: usedSalesforce ? 'Salesforce Token' : 'Google Calendar Token',
      status: (tokenVaultInfo?.google_token_obtained || tokenVaultInfo?.salesforce_token_obtained) ? 'completed' : 'pending',
      token: usedSalesforce ? tokenVaultInfo?.salesforce_token : tokenVaultInfo?.google_token,
      expiresIn: usedSalesforce ? tokenVaultInfo?.salesforce_expires_in : tokenVaultInfo?.google_expires_in,
      icon: usedSalesforce ? '☁️' : '📅',
      color: usedSalesforce ? 'sky' : 'rose',
      connection: usedSalesforce ? 'salesforce' : 'google-oauth2',
    },
  ];

  const getStatusColor = (status: string, color: string) => {
    if (status === 'completed') {
      return {
        bg: `bg-${color}-500/20`,
        border: `border-${color}-500/50`,
        text: `text-${color}-400`,
        dot: `bg-${color}-500`,
      };
    }
    return {
      bg: 'bg-slate-800/50',
      border: 'border-slate-700',
      text: 'text-slate-500',
      dot: 'bg-slate-600',
    };
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔐</span>
          <h3 className="text-sm font-semibold text-white">Token Flow</h3>
        </div>
        <span className="text-xs text-slate-500">View decoded tokens at each step</span>
      </div>

      {/* Steps */}
      <div className="p-3 space-y-2">
        {steps.map((step, index) => {
          const colors = getStatusColor(step.status, step.color);
          const isExpanded = expandedStep === step.step;
          
          return (
            <div key={step.step}>
              {/* Step Header */}
              <button
                onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                className={`w-full px-3 py-2 rounded-lg border transition-all ${colors.bg} ${colors.border} hover:bg-slate-800/80`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Step Number */}
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      step.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {step.status === 'completed' ? '✓' : step.step}
                    </div>
                    
                    {/* Step Info */}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Step {step.step}</span>
                        <span className="text-xs text-slate-600">{step.subtitle}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{step.icon}</span>
                        <span className={`text-sm font-medium ${step.status === 'completed' ? 'text-white' : 'text-slate-400'}`}>
                          {step.title}
                        </span>
                        {step.status === 'completed' && (
                          <span className="text-xs text-green-400">✓ Obtained</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expand Icon */}
                  <svg 
                    className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Token Details */}
              {isExpanded && step.token && (
                <div className="mt-2 ml-9 p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Token</span>
                      <button
                        onClick={() => copyToClipboard(step.token!)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Copy
                      </button>
                    </div>
                    <code className="block text-xs text-slate-300 bg-slate-900 p-2 rounded font-mono break-all">
                      {truncateToken(step.token)}
                    </code>
                    {step.expiresIn && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Expires in:</span>
                        <span className="text-amber-400">{step.expiresIn}s</span>
                      </div>
                    )}
                    {step.scope && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Scope:</span>
                        <span className="text-green-400">{step.scope}</span>
                      </div>
                    )}
                    {step.connection && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Connection:</span>
                        <span className="text-purple-400">{step.connection}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="ml-6 h-2 border-l-2 border-dashed border-slate-700" />
              )}
            </div>
          );
        })}
      </div>

      {/* Tools Called Summary */}
      {toolsCalled.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400">⚡</span>
            <span className="text-xs font-medium text-slate-400">Tools Executed</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {toolsCalled.map((tool, i) => (
              <span 
                key={i} 
                className={`text-xs px-2 py-1 rounded-full ${
                  tool.includes('salesforce') 
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : tool.includes('calendar') || tool.includes('availability')
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                }`}
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
