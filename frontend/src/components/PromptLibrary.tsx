/**
 * PromptLibrary.tsx
 * Optimized prompts with human-friendly language
 * Less repetitive, more variety in demo scenarios
 */

'use client';

import React, { useState } from 'react';

interface Prompt {
  id: string;
  text: string;
  description: string;
  outcome: string;
  ready: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: 'ready' | 'partial' | 'blocked';
  prompts: Prompt[];
}

interface PromptLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

const CATEGORIES: Category[] = [
  {
    id: 'client-portfolio',
    name: 'Client & Portfolio',
    icon: '👥',
    description: 'Okta XAA Token Exchange',
    status: 'ready',
    prompts: [
      { id: '1.1', text: 'Show me my client list', description: 'View all 4 active clients with AUM', outcome: 'Full portfolio summary', ready: true },
      { id: '1.2', text: "What's Marcus Thompson's portfolio allocation?", description: 'Detailed holdings breakdown', outcome: 'Asset allocation table', ready: true },
      { id: '1.3', text: 'Which client has the best YTD performance?', description: 'Compare across accounts', outcome: 'Priya Patel at 18.5%', ready: true },
      { id: '1.4', text: "When is James Chen's next review due?", description: 'Check review schedule', outcome: 'Jan 15, 2025 (overdue)', ready: true },
      { id: '1.5', text: "Update Elena's email to elena.new@email.com", description: 'Modify client record', outcome: 'Record updated', ready: true },
    ]
  },
  {
    id: 'payments',
    name: 'Payments & Transactions',
    icon: '💸',
    description: 'With approval workflows',
    status: 'ready',
    prompts: [
      { id: '2.1', text: 'Pay $500 from Marcus Thompson to Vanguard', description: 'Low value - auto-approved', outcome: 'Instant processing', ready: true },
      { id: '2.2', text: 'Transfer $8,000 from Elena to Fidelity', description: 'Medium value - logged', outcome: 'Processed with audit', ready: true },
      { id: '2.3', text: 'Process $15,000 payment for Priya Patel to TD Ameritrade', description: 'High value - requires manager approval', outcome: 'Pending approval', ready: true },
      { id: '2.4', text: 'Send $50,000 to Offshore Holdings LLC', description: 'Flagged recipient - compliance review', outcome: 'Blocked for review', ready: true },
    ]
  },
  {
    id: 'calendar',
    name: 'Calendar & Meetings',
    icon: '📅',
    description: 'Auth0 Token Vault',
    status: 'ready',
    prompts: [
      { id: '3.1', text: 'What meetings do I have this week?', description: 'List upcoming events', outcome: 'Weekly schedule', ready: true },
      { id: '3.2', text: 'Am I free Friday at 2pm?', description: 'Check availability', outcome: 'Availability status', ready: true },
      { id: '3.3', text: 'Schedule a portfolio review with Marcus Thompson next Tuesday at 10am', description: 'Create calendar event', outcome: 'Event created', ready: true },
      { id: '3.4', text: 'Find my next meeting with Elena', description: 'Search by attendee', outcome: 'Meeting details', ready: true },
    ]
  },
  {
    id: 'security-demos',
    name: 'Security Scenarios',
    icon: '🛡️',
    description: 'Access controls in action',
    status: 'ready',
    prompts: [
      { id: '4.1', text: 'Delete Marcus Thompson from the system', description: 'Requires admin privileges', outcome: 'Access denied - insufficient role', ready: true },
      { id: '4.2', text: 'Show me restricted client records', description: 'Compliance-held data', outcome: 'Access denied - compliance hold', ready: true },
      { id: '4.3', text: 'Process urgent $25,000 wire to unknown account', description: 'Suspicious transaction', outcome: 'Flagged for compliance review', ready: true },
    ]
  },
  {
    id: 'salesforce',
    name: 'Salesforce CRM',
    icon: '☁️',
    description: 'Coming soon',
    status: 'blocked',
    prompts: [
      { id: '5.1', text: 'Show Marcus Thompson in Salesforce', description: 'CRM contact lookup', outcome: 'Contact record', ready: false },
      { id: '5.2', text: "What's in my sales pipeline?", description: 'Opportunity list', outcome: 'Pipeline summary', ready: false },
      { id: '5.3', text: 'Create a task to follow up with Elena', description: 'CRM task creation', outcome: 'Task created', ready: false },
    ]
  },
];

export default function PromptLibrary({ isOpen, onClose, onSelectPrompt }: PromptLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState('client-portfolio');

  if (!isOpen) return null;

  const selectedCat = CATEGORIES.find(c => c.id === selectedCategory);
  const readyCount = CATEGORIES.reduce((sum, cat) => sum + cat.prompts.filter(p => p.ready).length, 0);
  const totalCount = CATEGORIES.reduce((sum, cat) => sum + cat.prompts.length, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-400';
      case 'partial': return 'text-yellow-400';
      case 'blocked': return 'text-slate-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-850">
          <div>
            <h2 className="text-lg font-semibold text-white">Demo Prompts</h2>
            <p className="text-sm text-slate-400">
              {readyCount} of {totalCount} scenarios ready
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-52 border-r border-slate-700 overflow-y-auto bg-slate-850/50">
            {CATEGORIES.map((cat) => {
              const readyInCat = cat.prompts.filter(p => p.ready).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full px-4 py-3 text-left transition-colors border-l-2 ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500'
                      : 'border-transparent hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{cat.icon}</span>
                    <span className={`font-medium text-sm ${
                      cat.status === 'blocked' ? 'text-slate-500' : 'text-white'
                    }`}>
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${getStatusColor(cat.status)}`}>
                      {readyInCat}/{cat.prompts.length} ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{cat.description}</p>
                </button>
              );
            })}
          </div>

          {/* Prompts List */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedCat && (
              <div className="space-y-2">
                {selectedCat.prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => prompt.ready && onSelectPrompt(prompt.text)}
                    disabled={!prompt.ready}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      prompt.ready
                        ? 'border-slate-700 hover:border-amber-500 hover:bg-slate-800 cursor-pointer'
                        : 'border-slate-800 bg-slate-850 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className={`font-medium ${prompt.ready ? 'text-white' : 'text-slate-600'}`}>
                          "{prompt.text}"
                        </p>
                        <p className={`text-sm mt-1 ${prompt.ready ? 'text-slate-400' : 'text-slate-600'}`}>
                          {prompt.description}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            prompt.ready 
                              ? 'bg-green-900/50 text-green-300 border border-green-700/50' 
                              : 'bg-slate-800 text-slate-600'
                          }`}>
                            → {prompt.outcome}
                          </span>
                        </div>
                      </div>
                      {prompt.ready && (
                        <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-700 bg-slate-850/50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Ready
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-600" /> Coming Soon
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
