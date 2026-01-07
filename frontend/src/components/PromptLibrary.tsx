/**
 * PromptLibrary.tsx
 * NATURAL PROMPTING VERSION - January 7, 2026
 * 
 * Key changes from explicit routing version:
 * - Removed "Use Google Calendar to...", "Use Salesforce to...", "Use Apex MCP server to..."
 * - Prompts now use natural language that relies on updated tool descriptions
 * - Multi-system workflows still use some explicit routing for clarity
 * 
 * The agent figures out which tool to use based on:
 * - Financial keywords (portfolio, AUM, holdings) → Internal MCP
 * - CRM keywords (opportunities, pipeline, CRM) → Salesforce
 * - Scheduling keywords (schedule, meeting, calendar) → Google Calendar
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
// NATURAL LANGUAGE PROMPTS (January 7, 2026)
// Agent automatically routes to correct tool based on context
// =============================================================================

const CATEGORIES: Category[] = [
  // =========================================================================
  // SALESFORCE (Token Vault) - CRM & Sales
  // =========================================================================
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
            text: 'Look up Marcus Thompson in CRM. I need his phone and email for a sales follow-up call.', 
            description: '✓ CRM contact lookup - Marcus Thompson', 
            action: 'READ',
            tested: true
          },
          { 
            id: 'sf-2', 
            text: 'What opportunities do we have with Elena Rodriguez? Show me the deal status and close dates.', 
            description: '✓ Sales opportunities - Elena Rodriguez', 
            action: 'READ',
            tested: true
          },
          { 
            id: 'sf-3', 
            text: 'Find contacts at Chen Industries in the CRM.', 
            description: '✓ Search CRM by company', 
            action: 'READ',
            tested: true
          },
          { 
            id: 'sf-3b', 
            text: 'Look up Priya Patel in CRM for an upcoming sales call.', 
            description: 'CRM contact lookup - Priya Patel', 
            action: 'READ' 
          },
          { 
            id: 'sf-3c', 
            text: 'What opportunities do we have with Robert Williams at Williams Estate?', 
            description: 'Sales opportunities - Williams Estate', 
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
            text: 'Create a new CRM contact: Mr. David Park, Chief Investment Officer at Park Family Investments. Phone: (650) 555-7001, Email: david.park@parkinvestments.com. Lead Source: Partner Referral. Notes: High-net-worth referral from James Chen with $5M in investable assets.', 
            description: '✓ Create CRM contact - David Park', 
            action: 'CREATE',
            note: 'Auto-creates Account if needed. Delete after demo.',
            tested: true
          },
          { 
            id: 'sf-5', 
            text: 'Create a follow-up task for Marcus Thompson: "Q1 Portfolio Review Prep" due January 10th, 2026. Priority: High. Notes: Prepare portfolio analysis and rebalancing recommendations.', 
            description: '✓ Create CRM task - Marcus Thompson', 
            action: 'CREATE',
            tested: true
          },
          { 
            id: 'sf-6', 
            text: 'Add a note to the Thompson Family Trust account titled "Client Meeting Notes": Discussed retirement timeline, client interested in increasing bond allocation. Follow up on tax-loss harvesting.', 
            description: '✓ Add CRM note - Thompson Family Trust', 
            action: 'CREATE',
            tested: true
          },
          { 
            id: 'sf-6b', 
            text: 'Create a follow-up task for Elena Rodriguez: "Retirement Planning Review" due January 15th, 2026. Priority: High. Notes: Review 401k rollover options and discuss income distribution strategy.', 
            description: 'Create CRM task - Elena Rodriguez', 
            action: 'CREATE' 
          },
        ]
      },
      {
        id: 'sf-update',
        name: 'Update - Opportunities',
        icon: '✏️',
        info: 'Valid stages: Prospecting, Qualification, Needs Analysis, Value Proposition, Proposal/Price Quote, Negotiation/Review, Closed Won, Closed Lost',
        prompts: [
          { 
            id: 'sf-7', 
            text: 'Update the Retirement Rollover - Rodriguez opportunity to Negotiation/Review stage.', 
            description: '✓ Advance opportunity stage - Rodriguez', 
            action: 'UPDATE',
            tested: true
          },
          { 
            id: 'sf-7b', 
            text: 'Mark the Portfolio Rebalancing - Thompson opportunity as Closed Won.', 
            description: 'Mark Thompson as Closed Won', 
            action: 'UPDATE' 
          },
          { 
            id: 'sf-8', 
            text: 'Update the Business Succession - Chen opportunity to Value Proposition stage.', 
            description: 'Advance Chen to Value Proposition', 
            action: 'UPDATE' 
          },
        ]
      },
      {
        id: 'sf-pipeline',
        name: 'Pipeline and Analytics',
        icon: '📊',
        prompts: [
          { 
            id: 'sf-9', 
            text: 'Show me the current sales pipeline summary grouped by stage.', 
            description: 'Sales pipeline by stage', 
            action: 'READ' 
          },
          { 
            id: 'sf-10', 
            text: 'What is our total pipeline value across all open opportunities?', 
            description: 'Total pipeline value', 
            action: 'READ' 
          },
          { 
            id: 'sf-11', 
            text: 'Find opportunities with deal value over $200,000.', 
            description: 'High-value opportunities', 
            action: 'READ' 
          },
        ]
      },
    ]
  },

  // =========================================================================
  // GOOGLE CALENDAR (Token Vault) - Scheduling
  // =========================================================================
  {
    id: 'google-calendar',
    name: 'Scheduling',
    icon: '📅',
    securityFlow: 'Google Calendar via Token Vault',
    color: 'rose',
    subSections: [
      {
        id: 'gc-create',
        name: 'Create Meetings',
        icon: '➕',
        info: 'Creates real calendar events. PST times display as +1 day in IST calendar view.',
        prompts: [
          { 
            id: 'gc-3', 
            text: 'Schedule a portfolio review meeting with Marcus Thompson (marcus@thompsonfamilytrust.com) for January 20th, 2026 at 2:00 PM PST.', 
            description: '✓ Schedule meeting - Marcus Thompson', 
            action: 'CREATE',
            note: 'Will display as Jan 21st in IST calendar view',
            tested: true
          },
          { 
            id: 'gc-4', 
            text: 'Set up a retirement planning session with Elena Rodriguez (elena.rodriguez@email.com) for January 22nd, 2026 at 10:00 AM PST to discuss 401k rollover options.', 
            description: 'Schedule meeting - Elena Rodriguez', 
            action: 'CREATE'
          },
          { 
            id: 'gc-5', 
            text: 'Schedule a business succession meeting with James Chen (jchen@chenindustries.com) for January 24th, 2026 at 3:00 PM PST.', 
            description: 'Schedule meeting - James Chen', 
            action: 'CREATE'
          },
        ]
      },
      {
        id: 'gc-cancel',
        name: 'Cancel Meetings',
        icon: '❌',
        info: 'Use the DATE SHOWN ON CALENDAR (IST view = +1 day from PST)',
        prompts: [
          { 
            id: 'gc-6', 
            text: 'Cancel my meeting with Marcus Thompson on January 21st, 2026.', 
            description: '✓ Cancel meeting by name and date', 
            action: 'CANCEL',
            note: 'Use the IST display date to cancel',
            tested: true
          },
        ]
      },
      {
        id: 'gc-view',
        name: 'View Meetings',
        icon: '📖',
        prompts: [
          { 
            id: 'gc-1', 
            text: 'What meetings do I have scheduled this week? I need to plan my availability for client calls.', 
            description: 'List weekly events', 
            action: 'READ' 
          },
          { 
            id: 'gc-2', 
            text: 'What client meetings do I have tomorrow? I need to prepare talking points.', 
            description: 'Tomorrow meetings', 
            action: 'READ' 
          },
        ]
      },
    ]
  },

  // =========================================================================
  // APEX MCP SERVER (Okta XAA) - Portfolio & Financial
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
        name: 'Read - Client and Portfolio Data',
        icon: '📖',
        prompts: [
          { 
            id: 'mcp-1', 
            text: 'Show me all my clients with their AUM and risk profiles.', 
            description: '✓ Client roster with AUM (Assets Under Management)', 
            action: 'READ',
            tested: true
          },
          { 
            id: 'mcp-2', 
            text: 'What is Marcus Thompson portfolio breakdown and YTD performance? Include asset allocation details.', 
            description: '✓ Portfolio details - Marcus Thompson', 
            action: 'READ',
            tested: true
          },
          { 
            id: 'mcp-3', 
            text: 'Show me recent transactions for Elena Rodriguez. I am preparing for her quarterly review.', 
            description: 'Transaction history - Elena Rodriguez', 
            action: 'READ' 
          },
          { 
            id: 'mcp-4', 
            text: 'What is our total Assets Under Management across all clients? I need this for the monthly leadership report.', 
            description: 'Total AUM report', 
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
            text: 'Update Elena Rodriguez risk profile from Moderate to Conservative. She is approaching retirement and wants to reduce portfolio volatility.', 
            description: 'Update risk profile', 
            action: 'UPDATE' 
          },
        ]
      },
    ]
  },

  // =========================================================================
  // HITL TRANSACTIONS (Okta XAA + Step-Up)
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
        info: 'Amount under $10,000 - Processes immediately without human review',
        prompts: [
          { 
            id: 'hitl-1', 
            text: 'Process a $5,000 transfer from Marcus Thompson brokerage account to his checking account.', 
            description: '✓ Small transfer - auto-approved', 
            action: 'CREATE', 
            expected: 'Transaction completes immediately. No approval required.',
            tested: true
          },
        ]
      },
      {
        id: 'hitl-manager',
        name: 'Step-Up Required ($10K+)',
        icon: '⚠️',
        info: 'Amount $10,000+ - Requires CIBA step-up authentication (push notification)',
        prompts: [
          { 
            id: 'hitl-2', 
            text: 'Process a $25,000 transfer from Elena Rodriguez IRA to her savings account.', 
            description: '✓ Medium transfer - CIBA step-up required', 
            action: 'CREATE', 
            expected: 'CIBA step-up authentication triggered. Push notification sent.',
            tested: true
          },
        ]
      },
      {
        id: 'hitl-vp',
        name: 'Large Transfers ($50K+)',
        icon: '⚠️',
        info: 'Amount $50,000-$250,000 - Requires additional approval',
        prompts: [
          { 
            id: 'hitl-3', 
            text: 'Process a $150,000 transfer from James Chen trust account to his business operating account for a real estate investment.', 
            description: 'Large transfer - additional approval', 
            action: 'CREATE', 
            expected: 'Transaction pending. Routed for additional review.' 
          },
        ]
      },
      {
        id: 'hitl-exec',
        name: 'Very Large Transfers ($250K+)',
        icon: '🛑',
        info: 'Amount over $250,000 - Requires compliance review',
        prompts: [
          { 
            id: 'hitl-4', 
            text: 'Process a $500,000 transfer from Marcus Thompson investment account to an external brokerage at Fidelity for portfolio consolidation.', 
            description: 'Very large transfer - compliance review', 
            action: 'CREATE', 
            expected: 'Multi-level approval required. Queued for compliance review.' 
          },
        ]
      },
    ]
  },

  // =========================================================================
  // COMBINED MULTI-SYSTEM WORKFLOWS
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
        info: 'Agent automatically coordinates between systems',
        prompts: [
          { 
            id: 'comb-1', 
            text: 'I have a meeting with Marcus Thompson next week. Get his CRM contact details and pull his current portfolio summary so I can prepare.', 
            description: '✓ CRM + Portfolio lookup (2 systems)', 
            action: 'READ',
            tested: true
          },
          { 
            id: 'comb-1b', 
            text: 'Look up James Chen contact information in CRM, then show his portfolio if he is an existing investment client.', 
            description: 'CRM + Portfolio lookup - James Chen', 
            action: 'READ' 
          },
        ]
      },
      {
        id: 'comb-triple',
        name: 'Triple System (CRM + Portfolio + Calendar)',
        icon: '🔗',
        info: 'Agent coordinates across all three systems',
        prompts: [
          { 
            id: 'comb-2', 
            text: 'I need to prepare for a client review with Elena Rodriguez. Get her CRM contact details and opportunities, pull her portfolio summary, and schedule a portfolio review meeting with her (elena.rodriguez@email.com) for January 25th, 2026 at 10:00 AM PST.', 
            description: '✓ Triple system - Elena Rodriguez (5 tools)', 
            action: 'CREATE',
            note: 'Calls: search_salesforce_contacts, get_contact_opportunities, get_client, get_portfolio, create_calendar_event',
            tested: true
          },
          { 
            id: 'comb-3', 
            text: 'James Chen from Chen Industries wants to discuss business succession planning. Look up his CRM contact and opportunities, check his portfolio, and schedule a meeting with him (jchen@chenindustries.com) for January 27th, 2026 at 3:00 PM PST.', 
            description: '✓ Triple system - James Chen (4 tools)', 
            action: 'CREATE',
            tested: true
          },
          { 
            id: 'comb-4', 
            text: 'Get Marcus Thompson current portfolio value and YTD performance, then schedule a Q1 review meeting with him (marcus@thompsonfamilytrust.com) for January 30th, 2026 at 2:00 PM PST to discuss rebalancing his equity allocation.', 
            description: 'Portfolio + Calendar - Marcus Thompson', 
            action: 'CREATE' 
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['salesforce']));
  const [expandedSubSections, setExpandedSubSections] = useState<Set<string>>(new Set(['sf-read']));

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
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Natural Language</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {testedPrompts} tested ✓ / {totalPrompts} total prompts - Agent auto-routes to correct system
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
                                  {subSection.info}
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
            ✓ = Tested Jan 7, 2026 | Natural Language Mode | Agent auto-routes based on context keywords
          </p>
        </div>
      </div>
    </div>
  );
}
