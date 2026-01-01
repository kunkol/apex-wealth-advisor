/**
 * PromptLibrary.tsx
 * PRODUCTION-READY - All prompts tested and verified
 * 
 * Key principles:
 * - Explicit tool routing (Use Google Calendar to..., Use Salesforce to..., Use Apex MCP server to...)
 * - Concrete dates, times, timezone (January 15th, 2026 at 2:00 PM PST)
 * - Explicit year to avoid auto-increment bugs
 * - Event IDs for cancel operations
 * - No apostrophes/special chars that might cause issues
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
// TESTED & VERIFIED PROMPTS
// =============================================================================

const CATEGORIES: Category[] = [
  {
    id: 'google-calendar',
    name: 'Scheduling',
    icon: '📅',
    securityFlow: 'Google Calendar via Token Vault',
    color: 'rose',
    subSections: [
      {
        id: 'gc-view',
        name: 'View Meetings',
        icon: '📖',
        prompts: [
          { 
            id: 'gc-1', 
            text: 'Use Google Calendar to show me all my meetings scheduled for this week. I want to plan my availability for client calls.', 
            description: 'List weekly events', 
            action: 'READ' 
          },
          { 
            id: 'gc-2', 
            text: 'Use Google Calendar to check what client meetings I have tomorrow. I need to prepare my talking points and review portfolios.', 
            description: 'Tomorrow meetings', 
            action: 'READ' 
          },
        ]
      },
      {
        id: 'gc-create',
        name: 'Create Meetings',
        icon: '➕',
        info: 'Creates real calendar events with invites sent to attendees',
        prompts: [
          { 
            id: 'gc-3', 
            text: 'Use Google Calendar to schedule a portfolio review meeting with Marcus Thompson (marcus.thompson@email.com) for January 15th, 2026 at 2:00 PM PST. The meeting is to discuss Q1 investment strategy and rebalancing options.', 
            description: 'Portfolio review - Marcus Thompson', 
            action: 'CREATE',
            note: 'Save the event_id from response for cancel testing'
          },
          { 
            id: 'gc-4', 
            text: 'Use Google Calendar to set up a retirement planning session with Elena Rodriguez (elena.rodriguez@email.com) for January 20th, 2026 at 10:00 AM PST. We will be reviewing her 401k rollover options and tax implications.', 
            description: 'Retirement planning - Elena Rodriguez', 
            action: 'CREATE'
          },
          { 
            id: 'gc-5', 
            text: 'Use Google Calendar to schedule an onboarding call with James Chen (jchen@chenindustries.com) for January 22nd, 2026 at 3:00 PM PST. This is our initial meeting to discuss his investment goals and risk tolerance.', 
            description: 'New client onboarding - James Chen', 
            action: 'CREATE'
          },
        ]
      },
      {
        id: 'gc-cancel',
        name: 'Cancel Meetings',
        icon: '❌',
        info: 'Searches by meeting title and date to find and cancel the event',
        prompts: [
          { 
            id: 'gc-6', 
            text: 'Use Google Calendar to cancel my meeting with Marcus Thompson on January 15th, 2026.', 
            description: 'Cancel meeting by name and date', 
            action: 'CANCEL'
          },
        ]
      },
    ]
  },
  {
    id: 'salesforce',
    name: 'Client CRM',
    icon: '👥',
    securityFlow: 'Salesforce via Token Vault',
    color: 'sky',
    subSections: [
      {
        id: 'sf-read',
        name: 'Read - Contacts and Opportunities',
        icon: '📖',
        prompts: [
          { 
            id: 'sf-1', 
            text: 'Use Salesforce to look up the contact details for Marcus Thompson. I need his phone number and email for a follow-up call about his portfolio.', 
            description: 'Contact lookup', 
            action: 'READ' 
          },
          { 
            id: 'sf-2', 
            text: 'Use Salesforce to show me all my open opportunities with expected close dates this quarter. I want to review my Q1 pipeline status for the team meeting.', 
            description: 'Pipeline view', 
            action: 'READ' 
          },
          { 
            id: 'sf-3', 
            text: 'Use Salesforce to find accounts in the Technology sector. I am preparing for our wealth management prospecting campaign.', 
            description: 'Account search', 
            action: 'READ' 
          },
        ]
      },
      {
        id: 'sf-create',
        name: 'Create - Records',
        icon: '➕',
        prompts: [
          { 
            id: 'sf-4', 
            text: 'Use Salesforce to create a new contact for James Chen at Chen Industries. His email is jchen@chenindustries.com and phone is 415-555-0123. He is a potential high-net-worth client referral.', 
            description: 'Create contact', 
            action: 'CREATE' 
          },
          { 
            id: 'sf-5', 
            text: 'Use Salesforce to create a new opportunity called "Trust Fund Setup" for account Chen Industries with an expected value of $500,000 and close date of March 31st, 2026.', 
            description: 'Create opportunity', 
            action: 'CREATE' 
          },
        ]
      },
      {
        id: 'sf-update',
        name: 'Update - Records',
        icon: '✏️',
        prompts: [
          { 
            id: 'sf-6', 
            text: 'Use Salesforce to update the opportunity stage to Negotiation for the most recent opportunity. Add a note that we received verbal approval yesterday.', 
            description: 'Update opportunity stage', 
            action: 'UPDATE' 
          },
        ]
      },
    ]
  },
  {
    id: 'apex-mcp',
    name: 'Portfolio Management',
    icon: '💼',
    securityFlow: 'Internal System via Okta XAA',
    color: 'green',
    subSections: [
      {
        id: 'mcp-read',
        name: 'Read - Client and Portfolio Data',
        icon: '📖',
        prompts: [
          { 
            id: 'mcp-1', 
            text: 'Use the Apex MCP server to show me my complete client roster with their AUM and risk profile. I need to prioritize outreach this week.', 
            description: 'Client roster', 
            action: 'READ' 
          },
          { 
            id: 'mcp-2', 
            text: 'Use the Apex MCP server to pull up the full portfolio breakdown for Marcus Thompson including asset allocation and YTD performance.', 
            description: 'Portfolio details - Marcus', 
            action: 'READ' 
          },
          { 
            id: 'mcp-3', 
            text: 'Use the Apex MCP server to show all transactions for Elena Rodriguez in the last 90 days. I am preparing for her quarterly review meeting.', 
            description: 'Transaction history - Elena', 
            action: 'READ' 
          },
          { 
            id: 'mcp-4', 
            text: 'Use the Apex MCP server to get our total assets under management across all clients. I need this metric for the monthly leadership report.', 
            description: 'Total AUM', 
            action: 'READ' 
          },
        ]
      },
      {
        id: 'mcp-update',
        name: 'Update - Client Profiles',
        icon: '✏️',
        prompts: [
          { 
            id: 'mcp-5', 
            text: 'Use the Apex MCP server to update Elena Rodriguez risk profile from Moderate to Conservative. She is approaching retirement and wants to reduce volatility.', 
            description: 'Update risk profile', 
            action: 'UPDATE' 
          },
        ]
      },
    ]
  },
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
        info: 'Amount: $5,000 | Approval: Auto | No human review needed',
        prompts: [
          { 
            id: 'hitl-1', 
            text: 'Use the Apex MCP server to process a $5,000 transfer from Marcus Thompson brokerage account to his checking account. He needs funds for a home repair.', 
            description: 'Small transfer - auto-approved', 
            action: 'CREATE', 
            expected: 'Transaction completes immediately. No approval required.' 
          },
        ]
      },
      {
        id: 'hitl-manager',
        name: 'Manager Approval ($10K-$50K)',
        icon: '⚠️',
        info: 'Amount: $25,000 | Approver: Sarah Johnson (Manager)',
        prompts: [
          { 
            id: 'hitl-2', 
            text: 'Use the Apex MCP server to process a $25,000 transfer from Elena Rodriguez IRA to her savings account for her daughter tuition payment.', 
            description: 'Medium transfer - manager approval', 
            action: 'CREATE', 
            expected: 'Transaction pending. Routed to manager Sarah Johnson for approval.' 
          },
        ]
      },
      {
        id: 'hitl-vp',
        name: 'VP Approval ($50K-$250K)',
        icon: '⚠️',
        info: 'Amount: $150,000 | Approver: Michael Roberts (VP Operations)',
        prompts: [
          { 
            id: 'hitl-3', 
            text: 'Use the Apex MCP server to process a $150,000 transfer from James Chen trust account to his business operating account for a real estate investment.', 
            description: 'Large transfer - VP approval', 
            action: 'CREATE', 
            expected: 'Transaction pending. Routed to VP Michael Roberts. Review time: 4-8 hours.' 
          },
        ]
      },
      {
        id: 'hitl-exec',
        name: 'Executive Approval (Over $250K)',
        icon: '🛑',
        info: 'Amount: $500,000 | Approvers: CFO + Compliance Team',
        prompts: [
          { 
            id: 'hitl-4', 
            text: 'Use the Apex MCP server to process a $500,000 transfer from Marcus Thompson investment account to an external brokerage at Fidelity for portfolio consolidation.', 
            description: 'Very large transfer - executive approval', 
            action: 'CREATE', 
            expected: 'Multi-level approval: Manager then VP then CFO then Compliance. ETA: 1-2 business days.' 
          },
        ]
      },
      {
        id: 'hitl-compliance',
        name: 'Compliance Flag (International)',
        icon: '🚨',
        info: 'International wire to high-risk jurisdiction triggers compliance review',
        prompts: [
          { 
            id: 'hitl-5', 
            text: 'Use the Apex MCP server to process a $75,000 wire transfer from Elena Rodriguez account to an international account in the Cayman Islands.', 
            description: 'International wire - compliance hold', 
            action: 'CREATE', 
            expected: 'Transaction held. Compliance flags: international destination, high-risk jurisdiction.' 
          },
        ]
      },
    ]
  },
  {
    id: 'combined',
    name: 'Multi-System Workflows',
    icon: '🔄',
    securityFlow: 'Combined Security Flows',
    color: 'purple',
    subSections: [
      {
        id: 'comb-flows',
        name: 'Multi-System Workflows',
        icon: '🔗',
        info: 'Demonstrates XAA + Token Vault in single request',
        prompts: [
          { 
            id: 'comb-1', 
            text: 'First, use the Apex MCP server to get Marcus Thompson current portfolio value and YTD performance. Then, use Google Calendar to schedule a Q1 review meeting with him (marcus.thompson@email.com) for January 25th, 2026 at 2:00 PM PST to discuss rebalancing his equity allocation.', 
            description: 'Portfolio lookup + Schedule meeting', 
            action: 'CREATE' 
          },
          { 
            id: 'comb-2', 
            text: 'Use Salesforce to look up contact information for James Chen. Then use the Apex MCP server to show his portfolio if he is an existing client.', 
            description: 'Salesforce + MCP lookup', 
            action: 'READ' 
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['google-calendar']));
  const [expandedSubSections, setExpandedSubSections] = useState<Set<string>>(new Set(['gc-create']));

  if (!isOpen) return null;

  const totalPrompts = CATEGORIES.reduce((sum, cat) => 
    sum + cat.subSections.reduce((subSum, sub) => subSum + sub.prompts.length, 0), 0
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleSubSection = (subSectionId: string) => {
    setExpandedSubSections(prev => {
      const next = new Set(prev);
      if (next.has(subSectionId)) {
        next.delete(subSectionId);
      } else {
        next.add(subSectionId);
      }
      return next;
    });
  };

  const handlePromptClick = (prompt: Prompt) => {
    onSelectPrompt(prompt.text);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📚 Prompt Library
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {totalPrompts} tested prompts - Click to use
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
                          {promptCount}
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
                              <span className="text-xs text-slate-500">({subSection.prompts.length})</span>
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
                                  {subSection.info}
                                </div>
                              )}
                              
                              {/* Prompts */}
                              {subSection.prompts.map((prompt) => (
                                <button
                                  key={prompt.id}
                                  onClick={() => handlePromptClick(prompt)}
                                  className="w-full text-left p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-600 transition-all group"
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
                                      <p className="text-xs text-slate-500 mt-1">
                                        {prompt.description}
                                      </p>
                                      
                                      {/* Note */}
                                      {prompt.note && (
                                        <div className="mt-2 text-xs text-blue-400/80 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                          {prompt.note}
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
            All prompts tested and verified. Dates use explicit year (2026) to avoid parsing issues.
          </p>
        </div>
      </div>
    </div>
  );
}
