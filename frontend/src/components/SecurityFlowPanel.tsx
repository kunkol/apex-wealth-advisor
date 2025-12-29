/**
 * SecurityFlowPanel.tsx
 * Combined animated security flow visualization
 * Shows query → token exchange → tool call → result in real-time
 */

'use client';

import React, { useState, useEffect } from 'react';

interface FlowStep {
  id: string;
  label: string;
  sublabel?: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  tokenPreview?: string;
  duration?: number;
}

interface SecurityFlowPanelProps {
  userInfo?: {
    name?: string;
    email?: string;
  };
  currentQuery?: string;
  xaaInfo?: {
    configured?: boolean;
    token_obtained?: boolean;
    id_jag_token?: string;
    mcp_access_token?: string;
    expires_in?: number;
    scope?: string;
  };
  tokenVaultInfo?: {
    configured?: boolean;
    google_token_obtained?: boolean;
    connection?: string;
  };
  toolsCalled?: string[];
  isProcessing?: boolean;
}

export default function SecurityFlowPanel({
  userInfo,
  currentQuery,
  xaaInfo,
  tokenVaultInfo,
  toolsCalled = [],
  isProcessing = false
}: SecurityFlowPanelProps) {
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [showTokenDetails, setShowTokenDetails] = useState(false);

  // Determine which flow to show based on tools called
  const isCalendarQuery = toolsCalled.some(t => 
    t.includes('calendar') || t.includes('meeting') || t.includes('schedule')
  );
  const isMCPQuery = toolsCalled.some(t => 
    t.includes('client') || t.includes('portfolio') || t.includes('payment')
  );

  useEffect(() => {
    if (isProcessing) {
      // Start animation
      setActiveStep(0);
      const interval = setInterval(() => {
        setActiveStep(prev => {
          if (prev >= flowSteps.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 400);
      return () => clearInterval(interval);
    }
  }, [isProcessing, flowSteps.length]);

  useEffect(() => {
    // Build flow based on what's happening
    const steps: FlowStep[] = [];

    // Step 1: User
    steps.push({
      id: 'user',
      label: userInfo?.name || 'User',
      sublabel: 'Authenticated',
      status: 'complete',
    });

    // Step 2: Okta
    steps.push({
      id: 'okta',
      label: 'Okta',
      sublabel: xaaInfo?.token_obtained ? 'ID-JAG Issued' : 'Identity Provider',
      status: xaaInfo?.token_obtained ? 'complete' : (isProcessing ? 'active' : 'pending'),
      tokenPreview: xaaInfo?.id_jag_token,
    });

    // Step 3: AI Agent
    steps.push({
      id: 'agent',
      label: 'Buffett AI',
      sublabel: toolsCalled.length > 0 ? `${toolsCalled.length} tool(s)` : 'Processing',
      status: toolsCalled.length > 0 ? 'complete' : (isProcessing ? 'active' : 'pending'),
    });

    // Step 4: Backend (MCP or Token Vault)
    if (isCalendarQuery) {
      steps.push({
        id: 'vault',
        label: 'Auth0 Vault',
        sublabel: tokenVaultInfo?.google_token_obtained ? 'Google Token' : 'Token Exchange',
        status: tokenVaultInfo?.google_token_obtained ? 'complete' : 'pending',
      });
      steps.push({
        id: 'google',
        label: 'Google Calendar',
        sublabel: 'External API',
        status: tokenVaultInfo?.google_token_obtained ? 'complete' : 'pending',
      });
    } else {
      steps.push({
        id: 'mcp',
        label: 'MCP Server',
        sublabel: toolsCalled.length > 0 ? toolsCalled[toolsCalled.length - 1] : 'Portfolio Data',
        status: toolsCalled.length > 0 ? 'complete' : 'pending',
        tokenPreview: xaaInfo?.mcp_access_token,
      });
    }

    setFlowSteps(steps);
  }, [userInfo, xaaInfo, tokenVaultInfo, toolsCalled, isProcessing, isCalendarQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-500 border-green-400';
      case 'active': return 'bg-blue-500 border-blue-400 animate-pulse';
      case 'error': return 'bg-red-500 border-red-400';
      default: return 'bg-slate-700 border-slate-600';
    }
  };

  const getLineColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      default: return 'bg-slate-600';
    }
  };

  const truncateToken = (token?: string) => {
    if (!token) return null;
    return token.substring(0, 20) + '...';
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-850">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-lg">🔐</span>
            Security Flow
          </h3>
          <button
            onClick={() => setShowTokenDetails(!showTokenDetails)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showTokenDetails 
                ? 'bg-amber-500 text-slate-900' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {showTokenDetails ? 'Hide Tokens' : 'Show Tokens'}
          </button>
        </div>
      </div>

      {/* Current Query */}
      {currentQuery && (
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-850/50">
          <p className="text-xs text-slate-500 mb-1">Current Query</p>
          <p className="text-sm text-white truncate">{currentQuery}</p>
        </div>
      )}

      {/* Flow Visualization */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {flowSteps.map((step, index) => (
            <div key={step.id}>
              {/* Step Node */}
              <div className={`
                p-3 rounded-lg border transition-all duration-300
                ${step.status === 'complete' ? 'bg-green-900/20 border-green-700/50' : ''}
                ${step.status === 'active' ? 'bg-blue-900/30 border-blue-600 shadow-lg shadow-blue-500/20' : ''}
                ${step.status === 'pending' ? 'bg-slate-800/50 border-slate-700' : ''}
                ${step.status === 'error' ? 'bg-red-900/20 border-red-700/50' : ''}
              `}>
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                    ${getStatusColor(step.status)}
                  `}>
                    {step.status === 'complete' && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {step.status === 'active' && (
                      <div className="w-3 h-3 bg-white rounded-full" />
                    )}
                    {step.status === 'pending' && (
                      <div className="w-2 h-2 bg-slate-500 rounded-full" />
                    )}
                    {step.status === 'error' && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${
                      step.status === 'pending' ? 'text-slate-400' : 'text-white'
                    }`}>
                      {step.label}
                    </p>
                    {step.sublabel && (
                      <p className={`text-xs ${
                        step.status === 'complete' ? 'text-green-400' :
                        step.status === 'active' ? 'text-blue-400' :
                        'text-slate-500'
                      }`}>
                        {step.sublabel}
                      </p>
                    )}
                  </div>

                  {/* Duration */}
                  {step.duration && (
                    <span className="text-xs text-slate-500">{step.duration}ms</span>
                  )}
                </div>

                {/* Token Preview */}
                {showTokenDetails && step.tokenPreview && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-500 mb-1">Token</p>
                    <code className="text-xs text-amber-400 font-mono break-all">
                      {truncateToken(step.tokenPreview)}
                    </code>
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {index < flowSteps.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className={`w-0.5 h-4 transition-all duration-300 ${
                    flowSteps[index + 1].status !== 'pending' ? 'bg-green-500' : 'bg-slate-600'
                  }`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tools Called Summary */}
      {toolsCalled.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-850/50">
          <p className="text-xs text-slate-500 mb-2">Tools Executed</p>
          <div className="flex flex-wrap gap-1">
            {toolsCalled.map((tool, i) => (
              <span 
                key={i}
                className="text-xs px-2 py-1 bg-green-900/50 text-green-300 rounded-full border border-green-700/50"
              >
                ✓ {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* XAA Info */}
      {xaaInfo?.token_obtained && showTokenDetails && (
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-850/50">
          <p className="text-xs text-slate-500 mb-2">XAA Token Details</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Scope:</span>
              <span className="text-amber-400 font-mono">{xaaInfo.scope || 'mcp:read'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Expires:</span>
              <span className="text-slate-300">{xaaInfo.expires_in}s</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-2 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Complete
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-600" /> Pending
          </span>
        </div>
      </div>
    </div>
  );
}
