/**
 * TokenVaultFlow.tsx
 * Visualizes the Token Vault flow for Google Calendar access
 * Shows: Okta Token → Auth0 Vault Token → Google Token → Calendar API
 */

'use client';

import React, { useState, useEffect } from 'react';

interface FlowStep {
  step: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  duration_ms?: number;
  details?: Record<string, any>;
  error?: string;
}

interface TokenVaultFlowProps {
  tokenVaultInfo?: {
    configured: boolean;
    google_token_obtained: boolean;
    connection: string;
  };
  isActive?: boolean;
}

export default function TokenVaultFlow({ tokenVaultInfo, isActive }: TokenVaultFlowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);

  useEffect(() => {
    if (tokenVaultInfo?.google_token_obtained) {
      // Show completed flow
      setFlowSteps([
        { step: 1, name: 'Okta Access Token', status: 'completed', details: { source: 'User Session' } },
        { step: 2, name: 'Auth0 Token Exchange', status: 'completed', details: { grant: 'token-exchange' } },
        { step: 3, name: 'Vault Token', status: 'completed', details: { audience: 'Token Vault API' } },
        { step: 4, name: 'Google Token', status: 'completed', details: { connection: 'google-oauth2' } },
        { step: 5, name: 'Calendar API', status: 'completed', details: { api: 'googleapis.com' } },
      ]);
    } else if (isActive) {
      // Show pending flow
      setFlowSteps([
        { step: 1, name: 'Okta Access Token', status: 'pending' },
        { step: 2, name: 'Auth0 Token Exchange', status: 'pending' },
        { step: 3, name: 'Vault Token', status: 'pending' },
        { step: 4, name: 'Google Token', status: 'pending' },
        { step: 5, name: 'Calendar API', status: 'pending' },
      ]);
    }
  }, [tokenVaultInfo, isActive]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'in_progress':
        return (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
            <div className="w-3 h-3 rounded-full bg-white" />
          </div>
        );
      default:
        return <div className="w-6 h-6 rounded-full bg-gray-600 border-2 border-gray-500" />;
    }
  };

  const getStepBg = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-900/30 border-green-700';
      case 'failed': return 'bg-red-900/30 border-red-700';
      case 'in_progress': return 'bg-blue-900/30 border-blue-700';
      default: return 'bg-gray-800/50 border-gray-700';
    }
  };

  if (!tokenVaultInfo?.configured && !isActive) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-purple-900/50 to-indigo-900/50 hover:from-purple-900/70 hover:to-indigo-900/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="font-semibold text-white">Token Vault Flow</span>
          {tokenVaultInfo?.google_token_obtained && (
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Active</span>
          )}
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Flow Steps */}
          {flowSteps.length > 0 ? (
            <div className="space-y-2">
              {flowSteps.map((step, index) => (
                <div key={step.step}>
                  <div className={`p-3 rounded-lg border ${getStepBg(step.status)} transition-all`}>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(step.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Step {step.step}</span>
                          <span className="font-medium text-white">{step.name}</span>
                        </div>
                        {step.details && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {Object.entries(step.details).map(([key, value]) => (
                              <span key={key} className="mr-2">{key}: {String(value)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Connector */}
                  {index < flowSteps.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className={`w-0.5 h-3 ${step.status === 'completed' ? 'bg-green-600' : 'bg-gray-600'}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Legend when no flow active */
            <div className="text-sm text-gray-400 space-y-2">
              <p className="text-xs text-gray-500 uppercase font-medium">Token Exchange Flow</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded text-xs">1</span>
                  <span>Okta Access Token from user session</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded text-xs">2</span>
                  <span>Exchange for Auth0 Vault token</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded text-xs">3</span>
                  <span>Get Google token from vault</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded text-xs">4</span>
                  <span>Access Google Calendar API</span>
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Auth0 Domain</span>
              <span className="text-gray-300">{tokenVaultInfo?.connection || 'google-oauth2'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
