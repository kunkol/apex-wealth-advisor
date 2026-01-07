/**
 * PromptLibrary.tsx
 * TESTED & ALIGNED VERSION - January 7, 2026
 * 
 * This PromptLibrary contains EXACTLY the prompts that were tested and verified
 * in the comprehensive 24-test validation (Phases 1-6).
 * 
 * All prompts use natural language - no explicit tool routing needed.
 * The agent figures out which tool to use based on context keywords:
 * - Financial keywords (portfolio, AUM, holdings) → Internal MCP
 * - CRM keywords (opportunities, pipeline, CRM, contact details) → Salesforce
 * - Scheduling keywords (schedule, meeting, calendar) → Google Calendar
 * 
 * Test Results: 24/24 PASSED (100%)
 */

'use client';

import React, { useState } from 'react';

// =============================================================================
// Types
// =============================================================================

interface Prompt {
  id: string;
  text: string;
  description: string;
  action?: 'CREATE' | 'CANCEL' | 'READ' | 'UPDATE' | 'CLOSE';
  expected?: string;
  note?: string;
  tested?: boolean;
  phase?: string;
}

interface SubSection {
  id: string;
  name: string;
  icon: string;
  info?: string;
  prompts: Prompt[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  securityFlow: string;
  color: string;
  subSections: SubSection[];
}

interface PromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// TESTED & VERIFIED PROMPTS - Aligned with Phase 1-6 Testing (Jan 7, 2026)
// =============================================================================

const CATEGORIES: Category[] = [
  // =========================================================================
  // PORTFOLIO MANAGEMENT (MCP via Okta XAA)
  // =========================================================================
  {
    id: 'apex-mcp',
    name: 'Portfolio Management',
    icon: '💼',
    securityFlow: 'Internal System via Okta XAA',
    color: 'green',
    subSections: [
      {
        id: 'mcp-read',
        name: 'Read - Portfolio & Client Data',
        icon: '📖',
        info: 'Financial queries route to internal MCP system',
        prompts: [
          // Phase 1 - Test 1.1
          { 
            id: 'p1-1', 
            text: 'Show me Marcus Thompson portfolio value and YTD performance.', 
            description: '✓ Phase 1.1 - Portfolio value query', 
            action: 'READ',
            phase: 'Phase 1',
            tested: true
          },
          // Phase 1 - Test 1.2
          { 
            id: 'p1-2', 
            text: 'Show me all my clients with their AUM and risk profiles.', 
            description: '✓ Phase 1.2 - Client roster with AUM', 
            action: 'READ',
            phase: 'Phase 1',
            tested: true
          },
          // Phase 2 - Test 2.2
          { 
            id: 'p2-2', 
            text: 'Tell me about James Chen\'s investment account.', 
            description: '✓ Phase 2.2 - Financial context routes to MCP', 
            action: 'READ',
            phase: 'Phase 2',
            tested: true
          },
        ]
      },
      {
        id: 'mcp-multi',
        name: 'Multi-System Query',
        icon: '🔗',
        info: 'Single prompt queries both MCP and Salesforce',
        prompts: [
          // Phase 2 - Test 2.3
          { 
            id: 'p2-3', 
            text: 'What is Priya Patel\'s portfolio and what opportunities do we have with her?', 
            description: '✓ Phase 2.3 - Portfolio + Opportunities (2 systems)', 
            action: 'READ',
            phase: 'Phase 2',
            note: 'Calls both get_client (MCP) and get_contact_opportunities (Salesforce)',
            tested: true
          },
        ]
      },
    ]
  },

  // =========================================================================
  // CLIENT CRM (Salesforce via Token Vault)
  // =========================================================================
  {
    id: 'salesforce',
    name: 'Client CRM',
    icon: '👥',
    securityFlow: 'Salesforce via Token Vault',
    color: 'sky',
    subSections: [
      {
        id: 'sf-contacts',
        name: 'Read - Contacts',
        icon: '📖',
        info: 'CRM/contact queries route to Salesforce',
        prompts: [
          // Phase 1 - Test 1.3
          { 
            id: 'p1-3', 
            text: 'Look up Marcus Thompson in CRM for a sales call.', 
            description: '✓ Phase 1.3 - CRM contact lookup', 
            action: 'READ',
            phase: 'Phase 1',
            tested: true
          },
          // Phase 2 - Test 2.1
          { 
            id: 'p2-1', 
            text: 'Look up Elena Rodriguez contact details.', 
            description: '✓ Phase 2.1 - Ambiguous "contact details" routes to CRM', 
            action: 'READ',
            phase: 'Phase 2',
            tested: true
          },
        ]
      },
      {
        id: 'sf-opportunities',
        name: 'Read - Opportunities',
        icon: '💰',
        prompts: [
          // Phase 1 - Test 1.4
          { 
            id: 'p1-4', 
            text: 'What opportunities do we have with Elena Rodriguez?', 
            description: '✓ Phase 1.4 - Sales opportunities query', 
            action: 'READ',
            phase: 'Phase 1',
            tested: true
          },
        ]
      },
      {
        id: 'sf-pipeline',
        name: 'Read - Pipeline & Analytics',
        icon: '📊',
        prompts: [
          // Phase 1 - Test 1.5
          { 
            id: 'p1-5', 
            text: 'Show me the current sales pipeline summary by stage.', 
            description: '✓ Phase 1.5 - Pipeline by stage', 
            action: 'READ',
            phase: 'Phase 1',
            tested: true
          },
          // Phase 5 - Test 5.3
          { 
            id: 'p5-3', 
            text: 'What is the total value of our open sales pipeline?', 
            description: '✓ Phase 5.3 - Total pipeline value', 
            action: 'READ',
            phase: 'Phase 5',
            tested: true
          },
          // Phase 5 - Test 5.4
          { 
            id: 'p5-4', 
            text: 'Show me all opportunities worth more than $100,000.', 
            description: '✓ Phase 5.4 - High-value opportunities', 
            action: 'READ',
            phase: 'Phase 5',
            tested: true
          },
        ]
      },
      {
        id: 'sf-create',
        name: 'Create - Tasks & Notes',
        icon: '➕',
        prompts: [
          // Phase 3 - Test 3.2
          { 
            id: 'p3-2', 
            text: 'Create a follow-up task for Elena Rodriguez: "Retirement Planning Call" due January 15th, 2026. Priority: High.', 
            description: '✓ Phase 3.2 - Create CRM task', 
            action: 'CREATE',
            phase: 'Phase 3',
            tested: true
          },
          // Phase 5 - Test 5.1
          { 
            id: 'p5-1', 
            text: 'Create a task for Marcus Thompson: "Review Q1 Investment Strategy" due January 18th, 2026. Priority: Normal. Notes: Prepare rebalancing recommendations based on market conditions.', 
            description: '✓ Phase 5.1 - Create task with notes', 
            action: 'CREATE',
            phase: 'Phase 5',
            tested: true
          },
          // Phase 5 - Test 5.2
          { 
            id: 'p5-2', 
            text: 'Add a note to the Rodriguez Retirement Fund account titled "Retirement Timeline Discussion": Client confirmed target retirement date of 2028. Wants to shift to more conservative allocation over next 18 months. Discussed Social Security timing options.', 
            description: '✓ Phase 5.2 - Add account note', 
            action: 'CREATE',
            phase: 'Phase 5',
            tested: true
          },
        ]
      },
      {
        id: 'sf-update',
        name: 'Update - Opportunity Stages',
        icon: '✏️',
        info: 'Stages: Prospecting → Qualification → Needs Analysis → Value Proposition → Proposal/Price Quote → Negotiation/Review → Closed Won/Lost',
        prompts: [
          // Phase 3 - Test 3.3
          { 
            id: 'p3-3', 
            text: 'Update the Portfolio Rebalancing - Thompson opportunity to Closed Won.', 
            description: '✓ Phase 3.3 - Mark opportunity Closed Won', 
            action: 'UPDATE',
            phase: 'Phase 3',
            tested: true
          },
        ]
      },
    ]
  },

  // =========================================================================
  // SCHEDULING (Google Calendar via Token Vault)
  // =========================================================================
  {
    id: 'google-calendar',
    name: 'Scheduling',
    icon: '📅',
    securityFlow: 'Google Calendar via Token Vault',
    color: 'rose',
    subSections: [
      {
        id: 'gc-view',
        name: 'View - Calendar',
        icon: '📖',
        prompts: [
          // Phase 1 - Test 1.6
          { 
            id: 'p1-6', 
            text: 'What meetings do I have this week?', 
            description: '✓ Phase 1.6 - List weekly meetings', 
            action: 'READ',
            phase: 'Phase 1',
            tested: true
          },
        ]
      },
      {
        id: 'gc-create',
        name: 'Create - Meetings',
        icon: '➕',
        info: 'Creates real calendar events. PST times display as +1 day in IST.',
        prompts: [
          // Phase 3 - Test 3.1
          { 
            id: 'p3-1', 
            text: 'Schedule a portfolio review with Marcus Thompson (marcus@thompsonfamilytrust.com) for January 20th, 2026 at 2:00 PM PST.', 
            description: '✓ Phase 3.1 - Schedule meeting', 
            action: 'CREATE',
            phase: 'Phase 3',
            tested: true
          },
        ]
      },
    ]
  },

  // =========================================================================
  // TRANSACTIONS & APPROVALS (HITL via Okta XAA)
  // =========================================================================
  {
    id: 'hitl',
    name: 'Transactions & Approvals',
    icon: '💸',
    securityFlow: 'HITL Governance via Okta XAA',
    color: 'amber',
    subSections: [
      {
        id: 'hitl-auto',
        name: 'Auto-Approved (Under $10K)',
        icon: '✅',
        info: 'Transactions under $10,000 process immediately',
        prompts: [
          // Phase 3 - Test 3.4
          { 
            id: 'p3-4', 
            text: 'Process a $5,000 transfer from Marcus Thompson brokerage to his checking account.', 
            description: '✓ Phase 3.4 - Auto-approved transfer', 
            action: 'CREATE',
            phase: 'Phase 3',
            expected: 'Transaction approved immediately',
            tested: true
          },
        ]
      },
      {
        id: 'hitl-stepup',
        name: 'Step-Up Required ($10K+)',
        icon: '🔐',
        info: 'Transactions $10,000+ require CIBA push notification approval',
        prompts: [
          // Phase 3 - Test 3.5
          { 
            id: 'p3-5', 
            text: 'Process a $15,000 transfer from Elena Rodriguez IRA to her savings account.', 
            description: '✓ Phase 3.5 - CIBA step-up triggered', 
            action: 'CREATE',
            phase: 'Phase 3',
            expected: 'Step-up auth required - push notification sent',
            tested: true
          },
        ]
      },
    ]
  },

  // =========================================================================
  // MULTI-SYSTEM WORKFLOWS
  // =========================================================================
  {
    id: 'combined',
    name: 'Multi-System Workflows',
    icon: '🔄',
    securityFlow: 'Combined: XAA + Token Vault',
    color: 'purple',
    subSections: [
      {
        id: 'comb-dual',
        name: 'Dual System (2 tools)',
        icon: '🔗',
        prompts: [
          // Phase 4 - Test 4.1
          { 
            id: 'p4-1', 
            text: 'I have a meeting with James Chen next week. Get his CRM contact details and pull his portfolio summary.', 
            description: '✓ Phase 4.1 - CRM + Portfolio (2 tools)', 
            action: 'READ',
            phase: 'Phase 4',
            note: 'Calls search_salesforce_contacts + get_client',
            tested: true
          },
        ]
      },
      {
        id: 'comb-triple',
        name: 'Triple System (5 tools)',
        icon: '🔗',
        info: 'Single prompt coordinates CRM + Portfolio + Calendar',
        prompts: [
          // Phase 4 - Test 4.2
          { 
            id: 'p4-2', 
            text: 'Prepare for a client review with Elena Rodriguez. Get her CRM contact and opportunities, pull her portfolio, and schedule a meeting with her (elena.rodriguez@email.com) for January 25th, 2026 at 10:00 AM PST.', 
            description: '✓ Phase 4.2 - Triple system (5 tools)', 
            action: 'CREATE',
            phase: 'Phase 4',
            note: 'Calls: search_salesforce_contacts, get_contact_opportunities, get_client, get_portfolio, create_calendar_event',
            tested: true
          },
        ]
      },
      {
        id: 'comb-reset',
        name: 'Demo Reset (Cleanup)',
        icon: '🧹',
        info: 'Use these prompts to reset demo data after testing. Run in order.',
        prompts: [
          // Phase 6 - Test 6.1
          { 
            id: 'p6-1', 
            text: 'Update the Portfolio Rebalancing - Thompson opportunity to Negotiation/Review stage.', 
            description: '✓ Phase 6.1 - Reset Thompson opportunity', 
            action: 'UPDATE',
            phase: 'Phase 6',
            tested: true
          },
          // Phase 6 - Test 6.2
          { 
            id: 'p6-2', 
            text: 'Update the Retirement Rollover - Rodriguez opportunity to Proposal/Price Quote stage.', 
            description: '✓ Phase 6.2 - Reset Rodriguez opportunity', 
            action: 'UPDATE',
            phase: 'Phase 6',
            tested: true
          },
          // Phase 6 - Test 6.3
          { 
            id: 'p6-3', 
            text: 'Cancel my meeting with Elena Rodriguez on January 25th, 2026.', 
            description: '✓ Phase 6.3 - Cancel Elena meeting', 
            action: 'CANCEL',
            phase: 'Phase 6',
            note: 'Adjust date to match when meeting was created',
            tested: true
          },
          // Phase 6 - Test 6.4
          { 
            id: 'p6-4', 
            text: 'Cancel my portfolio review meeting with Marcus Thompson on January 20th, 2026.', 
            description: '✓ Phase 6.4 - Cancel Marcus meeting', 
            action: 'CANCEL',
            phase: 'Phase 6',
            note: 'Adjust date to match when meeting was created',
            tested: true
          },
        ]
      },
    ]
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

const getActionColor = (action?: string) => {
  switch (action) {
    case 'CREATE': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'CANCEL': 
    case 'CLOSE': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'UPDATE': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'READ': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getCategoryColor = (color: string) => {
  switch (color) {
    case 'rose': return 'border-rose-500/30 bg-rose-500/10';
    case 'sky': return 'border-sky-500/30 bg-sky-500/10';
    case 'green': return 'border-green-500/30 bg-green-500/10';
    case 'amber': return 'border-amber-500/30 bg-amber-500/10';
    case 'purple': return 'border-purple-500/30 bg-purple-500/10';
    default: return 'border-slate-500/30 bg-slate-500/10';
  }
};

const getCategoryTextColor = (color: string) => {
  switch (color) {
    case 'rose': return 'text-rose-400';
    case 'sky': return 'text-sky-400';
    case 'green': return 'text-green-400';
    case 'amber': return 'text-amber-400';
    case 'purple': return 'text-purple-400';
    default: return 'text-slate-400';
  }
};

// =============================================================================
// Component
// =============================================================================

export default function PromptLibrary({
  onSelectPrompt,
  isOpen,
  onClose,
}: PromptLibraryProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['apex-mcp']));
  const [expandedSubSections, setExpandedSubSections] = useState<Set<string>>(new Set(['mcp-read']));

  if (!isOpen) return null;

  const totalPrompts = CATEGORIES.reduce((sum, cat) => 
    sum + cat.subSections.reduce((subSum, sub) => subSum + sub.prompts.length, 0), 0);
  
  const testedPrompts = CATEGORIES.reduce((sum, cat) => 
    sum + cat.subSections.reduce((subSum, sub) => 
      subSum + sub.prompts.filter(p => p.tested).length, 0), 0);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleSubSection = (subSectionId: string) => {
    setExpandedSubSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subSectionId)) {
        newSet.delete(subSectionId);
      } else {
        newSet.add(subSectionId);
      }
      return newSet;
    });
  };

  const handlePromptClick = (prompt: Prompt) => {
    onSelectPrompt(prompt.text);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📚 Prompt Library
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">24/24 Tested</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {testedPrompts}/{totalPrompts} prompts verified • Natural language routing • Phase 1-6 aligned
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-4 space-y-3">
          {CATEGORIES.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const promptCount = category.subSections.reduce((sum, sub) => sum + sub.prompts.length, 0);
            const testedCount = category.subSections.reduce((sum, sub) => 
              sum + sub.prompts.filter(p => p.tested).length, 0);
            
            return (
              <div key={category.id} className={`rounded-xl border ${getCategoryColor(category.color)}`}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{category.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {testedCount}✓ / {promptCount}
                        </span>
                      </div>
                      <span className={`text-xs ${getCategoryTextColor(category.color)}`}>
                        {category.securityFlow}
                      </span>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Category Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {category.subSections.map((subSection) => {
                      const isSubExpanded = expandedSubSections.has(subSection.id);
                      const subTestedCount = subSection.prompts.filter(p => p.tested).length;
                      
                      return (
                        <div key={subSection.id} className="rounded-lg border border-slate-700/50 bg-slate-800/30">
                          {/* SubSection Header */}
                          <button
                            onClick={() => toggleSubSection(subSection.id)}
                            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-700/30 transition-colors rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <span>{subSection.icon}</span>
                              <span className="text-sm font-medium text-slate-200">{subSection.name}</span>
                              <span className="text-xs text-slate-500">
                                ({subTestedCount > 0 ? `${subTestedCount}✓/` : ''}{subSection.prompts.length})
                              </span>
                            </div>
                            <svg 
                              className={`w-4 h-4 text-slate-500 transition-transform ${isSubExpanded ? 'rotate-180' : ''}`} 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* SubSection Content */}
                          {isSubExpanded && (
                            <div className="px-3 pb-3 space-y-2">
                              {/* Info Banner */}
                              {subSection.info && (
                                <div className="text-xs text-slate-400 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700/50">
                                  ℹ️ {subSection.info}
                                </div>
                              )}
                              
                              {/* Prompts */}
                              {subSection.prompts.map((prompt) => (
                                <button
                                  key={prompt.id}
                                  onClick={() => handlePromptClick(prompt)}
                                  className={`w-full text-left p-3 rounded-lg border transition-all group ${
                                    prompt.tested 
                                      ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/50' 
                                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-600'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Action Badge */}
                                    {prompt.action && (
                                      <span className={`text-xs px-2 py-1 rounded border font-medium flex-shrink-0 ${getActionColor(prompt.action)}`}>
                                        {prompt.action}
                                      </span>
                                    )}
                                    
                                    <div className="flex-1 min-w-0">
                                      {/* Prompt Text */}
                                      <p className="text-sm text-slate-200 leading-relaxed">
                                        {prompt.text}
                                      </p>
                                      
                                      {/* Description */}
                                      <p className={`text-xs mt-1 ${prompt.tested ? 'text-green-400' : 'text-slate-500'}`}>
                                        {prompt.description}
                                      </p>
                                      
                                      {/* Note */}
                                      {prompt.note && (
                                        <div className="mt-2 text-xs text-blue-400/80 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                          💡 {prompt.note}
                                        </div>
                                      )}
                                      
                                      {/* Expected Result */}
                                      {prompt.expected && (
                                        <div className="mt-2 text-xs text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                          Expected: {prompt.expected}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Arrow */}
                                    <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950">
          <p className="text-xs text-slate-500 text-center">
            ✓ All 24 prompts tested Jan 7, 2026 • Natural language routing • Use "Demo Reset" section to cleanup after testing
          </p>
        </div>
      </div>
    </div>
  );
}
