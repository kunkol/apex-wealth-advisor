'use client';

import { useState } from 'react';

interface SecurityFlowProps {
  activeFlow?: 'mcp' | 'salesforce' | 'google' | 'bigquery' | null;
  toolsCalled?: string[];
  isAuthenticated?: boolean;
  userName?: string;
}

export default function SecurityFlowDiagram({ 
  activeFlow, 
  toolsCalled = [], 
  isAuthenticated = false,
  userName = 'User'
}: SecurityFlowProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Determine which connections are active
  const hasMcpCall = toolsCalled.some(t => 
    ['get_client', 'list_clients', 'get_portfolio', 'process_payment', 'update_client'].includes(t)
  );
  const hasSalesforceCall = toolsCalled.some(t => t.includes('salesforce') || t.includes('contact') || t.includes('opportunity'));
  const hasGoogleCall = toolsCalled.some(t => t.includes('calendar') || t.includes('google'));
  const hasBigQueryCall = toolsCalled.some(t => t.includes('bigquery') || t.includes('analytics'));

  return (
    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
          <span className="font-medium text-white">Security Architecture</span>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4">
          {/* Architecture Diagram */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-600">
            
            {/* Row 1: User */}
            <div className="flex justify-center mb-3">
              <div className={`px-4 py-2 rounded-lg border-2 ${isAuthenticated ? 'bg-green-900/30 border-green-500' : 'bg-slate-700 border-slate-500'}`}>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">👤</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{userName}</p>
                    <p className="text-xs text-green-400">{isAuthenticated ? '✓ Authenticated' : 'Not logged in'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow down */}
            <div className="flex justify-center mb-2">
              <div className="w-0.5 h-4 bg-gradient-to-b from-green-500 to-blue-500"></div>
            </div>

            {/* Row 2: Identity Layer (Okta) */}
            <div className="flex justify-center mb-3">
              <div className="bg-blue-900/40 border-2 border-blue-500 rounded-lg px-6 py-3">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <span className="text-lg">🔐</span>
                    <span className="font-bold text-blue-300">OKTA</span>
                  </div>
                  <p className="text-xs text-blue-400">SSO + XAA Token Exchange</p>
                  <div className="flex justify-center space-x-2 mt-2">
                    <span className="text-xs bg-blue-800/50 px-2 py-0.5 rounded text-blue-300">ID Token</span>
                    <span className="text-xs bg-blue-800/50 px-2 py-0.5 rounded text-blue-300">ID-JAG</span>
                    <span className="text-xs bg-blue-800/50 px-2 py-0.5 rounded text-blue-300">MCP Token</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow down */}
            <div className="flex justify-center mb-2">
              <div className="w-0.5 h-4 bg-gradient-to-b from-blue-500 to-amber-500"></div>
            </div>

            {/* Row 3: AI Agent */}
            <div className="flex justify-center mb-3">
              <div className="bg-amber-900/40 border-2 border-amber-500 rounded-lg px-6 py-3">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <span className="text-lg">🤖</span>
                    <span className="font-bold text-amber-300">Buffett AI Agent</span>
                  </div>
                  <p className="text-xs text-amber-400">Claude + Tool Orchestration</p>
                  <div className="flex justify-center space-x-2 mt-2">
                    <span className="text-xs bg-amber-800/50 px-2 py-0.5 rounded text-amber-300">FGA Check</span>
                    <span className="text-xs bg-amber-800/50 px-2 py-0.5 rounded text-amber-300">CIBA Step-Up</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Branching arrows */}
            <div className="flex justify-center mb-2">
              <div className="flex items-end space-x-8">
                <div className={`w-12 h-4 border-l-2 border-b-2 rounded-bl-lg ${hasMcpCall ? 'border-purple-500' : 'border-slate-600'}`}></div>
                <div className={`w-0.5 h-4 ${hasSalesforceCall || hasGoogleCall ? 'bg-cyan-500' : 'bg-slate-600'}`}></div>
                <div className={`w-12 h-4 border-r-2 border-b-2 rounded-br-lg ${hasBigQueryCall ? 'border-green-500' : 'border-slate-600'}`}></div>
              </div>
            </div>

            {/* Row 4: Data Sources */}
            <div className="grid grid-cols-3 gap-2">
              {/* Internal MCP */}
              <div className={`rounded-lg p-2 border-2 transition-all ${hasMcpCall ? 'bg-purple-900/40 border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-slate-800/50 border-slate-600'}`}>
                <div className="text-center">
                  <span className="text-lg">🏢</span>
                  <p className="text-xs font-semibold text-white mt-1">Internal MCP</p>
                  <p className="text-xs text-slate-400">Portfolio Data</p>
                  {hasMcpCall && (
                    <div className="mt-1">
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full animate-pulse">ACTIVE</span>
                    </div>
                  )}
                </div>
              </div>

              {/* External SaaS (Salesforce/Google) */}
              <div className={`rounded-lg p-2 border-2 transition-all ${(hasSalesforceCall || hasGoogleCall) ? 'bg-cyan-900/40 border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-slate-800/50 border-slate-600'}`}>
                <div className="text-center">
                  <div className="flex justify-center space-x-1">
                    <span className="text-sm">☁️</span>
                    <span className="text-sm">📅</span>
                  </div>
                  <p className="text-xs font-semibold text-white mt-1">External SaaS</p>
                  <p className="text-xs text-slate-400">SF • Google</p>
                  <div className="mt-1">
                    <span className="text-xs bg-cyan-900/50 text-cyan-300 px-1 py-0.5 rounded">Auth0 Vault</span>
                  </div>
                </div>
              </div>

              {/* External MCP (BigQuery) */}
              <div className={`rounded-lg p-2 border-2 transition-all ${hasBigQueryCall ? 'bg-green-900/40 border-green-500 shadow-lg shadow-green-500/20' : 'bg-slate-800/50 border-slate-600'}`}>
                <div className="text-center">
                  <span className="text-lg">📊</span>
                  <p className="text-xs font-semibold text-white mt-1">External MCP</p>
                  <p className="text-xs text-slate-400">BigQuery</p>
                  <div className="mt-1">
                    <span className="text-xs bg-green-900/50 text-green-300 px-1 py-0.5 rounded">Auth0 Vault</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Legend */}
            <div className="mt-4 pt-3 border-t border-slate-600">
              <p className="text-xs font-semibold text-slate-400 mb-2">Security Controls</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-xs text-slate-300">Okta XAA (ID-JAG)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                  <span className="text-xs text-slate-300">Auth0 Token Vault</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-amber-500 rounded"></div>
                  <span className="text-xs text-slate-300">FGA (Fine-Grained)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-xs text-slate-300">CIBA Step-Up Auth</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Flow Details */}
          {(hasMcpCall || hasSalesforceCall || hasGoogleCall || hasBigQueryCall) && (
            <div className="mt-3 bg-slate-700/50 rounded-lg p-3 border border-slate-600">
              <p className="text-xs font-semibold text-white mb-2">🔄 Active Data Flows</p>
              <div className="space-y-1">
                {hasMcpCall && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-purple-300">Internal MCP → Portfolio/Client Data</span>
                    <span className="text-xs text-slate-500">(Okta XAA)</span>
                  </div>
                )}
                {hasSalesforceCall && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-cyan-300">Salesforce → CRM Data</span>
                    <span className="text-xs text-slate-500">(Auth0 Vault)</span>
                  </div>
                )}
                {hasGoogleCall && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-cyan-300">Google Calendar → Schedule</span>
                    <span className="text-xs text-slate-500">(Auth0 Vault)</span>
                  </div>
                )}
                {hasBigQueryCall && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-300">BigQuery MCP → Analytics</span>
                    <span className="text-xs text-slate-500">(Auth0 Vault)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
