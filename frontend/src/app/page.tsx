'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import PromptLibrary from '@/components/PromptLibrary';
import SecurityFlowTab from '@/components/SecurityFlowTab';
import DemoGuideTab from '@/components/DemoGuideTab';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsCalled?: string[];
}

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
  };
  rawToken?: string;
}

// Decode JWT helper
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

// Token Display Card Component
function TokenDisplayCard({ 
  title, 
  token, 
  color, 
  icon,
  description 
}: { 
  title: string; 
  token?: string; 
  color: string;
  icon: string;
  description: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const decoded = token ? decodeJWT(token) : null;
  const isOpaqueToken = token && !decoded;

  return (
    <div className={`rounded-xl border ${color} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div className="text-left">
            <span className="font-medium text-white text-sm">{title}</span>
            {token && <span className="ml-2 text-xs text-green-400">✓</span>}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-slate-500">{description}</p>
          
          {token ? (
            <>
              {decoded && (
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <p className="text-[10px] font-medium text-slate-400 mb-1">Decoded Claims</p>
                  <pre className="text-[10px] text-slate-300 overflow-x-auto max-h-32 overflow-y-auto">
                    {JSON.stringify(decoded, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="bg-slate-900 rounded-lg p-2">
                <p className="text-[10px] font-medium text-slate-400 mb-1">
                  {isOpaqueToken ? 'Opaque Token' : 'Raw Token'}
                </p>
                <p className="text-[9px] text-slate-500 font-mono break-all line-clamp-2">
                  {token.substring(0, 80)}...
                </p>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-600 italic">Not yet obtained</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApexWealthAdvisor() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastXAAInfo, setLastXAAInfo] = useState<any>(null);
  const [lastTokenVaultInfo, setLastTokenVaultInfo] = useState<any>(null);
  const [lastToolsCalled, setLastToolsCalled] = useState<string[]>([]);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'agent' | 'security' | 'guide'>('agent');
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeWelcome = () => {
    setMessages([{
      id: '1',
      content: `Welcome to Apex Wealth Advisor, ${session?.user?.name || 'Advisor'}! I can help you with client information, portfolio data, calendar scheduling, and transactions. How can I assist you today?`,
      role: 'assistant',
      timestamp: new Date()
    }]);
  };

  useEffect(() => {
    if (session && messages.length === 0) {
      initializeWelcome();
    }
  }, [session]);

  const handleNewChat = () => {
    setMessages([]);
    setLastXAAInfo(null);
    setLastTokenVaultInfo(null);
    setLastToolsCalled([]);
    setAuditTrail([]);
    setTimeout(() => initializeWelcome(), 100);
  };

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const addAuditEntry = (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    setAuditTrail(prev => [...prev, {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date()
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    addAuditEntry({
      step: 'User Request',
      status: 'success',
      details: { tokenType: 'User Input' }
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(session as any)?.accessToken || ''}`, 'X-ID-Token': (session as any)?.idToken || '' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          session_id: session?.user?.email || 'session'
        })
      });

      const data = await response.json();
      setIsTyping(false);

      if (data.xaa_info) {
        setLastXAAInfo(data.xaa_info);
        if (data.xaa_info.id_jag_token) {
          addAuditEntry({
            step: 'ID-JAG Token Exchange',
            status: 'success',
            details: { tokenType: 'ID-JAG', expiresIn: data.xaa_info.id_jag_expires_in || 300 },
            rawToken: data.xaa_info.id_jag_token
          });
        }
        if (data.xaa_info.mcp_token) {
          addAuditEntry({
            step: 'MCP Auth Server Token',
            status: 'success',
            details: { tokenType: 'MCP Token', expiresIn: data.xaa_info.mcp_token_expires_in || 3600, scopes: ['mcp:read'] },
            rawToken: data.xaa_info.mcp_token
          });
        }
      }
      
      if (data.token_vault_info) {
        setLastTokenVaultInfo(data.token_vault_info);
        if (data.token_vault_info.vault_token) {
          addAuditEntry({
            step: 'Auth0 Vault Token',
            status: 'success',
            details: { tokenType: 'Vault Token', audience: 'vault.dell.auth101.dev' },
            rawToken: data.token_vault_info.vault_token
          });
        }
        if (data.token_vault_info.google_token) {
          addAuditEntry({
            step: 'Google Calendar Token',
            status: 'success',
            details: { tokenType: 'Google Access Token', connection: 'google-oauth2', expiresIn: data.token_vault_info.google_expires_in },
            rawToken: data.token_vault_info.google_token
          });
        }
      }
      
      if (data.tools_called?.length > 0) {
        setLastToolsCalled(prev => [...new Set([...prev, ...data.tools_called])]);
        data.tools_called.forEach((tool: string) => {
          addAuditEntry({
            step: `Tool: ${tool}`,
            status: 'success',
            details: { tokenType: 'Tool Execution' }
          });
        });
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || data.error || 'No response',
        timestamp: new Date(),
        toolsCalled: data.tools_called
      }]);

    } catch (error) {
      setIsTyping(false);
      addAuditEntry({ step: 'Error', status: 'error', details: { tokenType: 'Request Failed' } });
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">AW</span>
          </div>
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        <header className="border-b border-slate-800 bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold text-slate-900">AW</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Apex Wealth Advisor</h1>
                <p className="text-xs text-slate-500">AI-Powered Portfolio Management</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-10 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-slate-900">AW</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-slate-400 mb-8">Sign in to manage your client portfolios</p>

              <button
                onClick={() => signIn('okta')}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold py-4 px-8 rounded-2xl transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.389 0 0 5.389 0 12s5.389 12 12 12 12-5.389 12-12S18.611 0 12 0zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"/>
                </svg>
                Sign in with Okta
              </button>

              <p className="text-xs text-slate-600 mt-6">
                Secured by Okta Identity Cloud
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Application with Tabs
  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left - Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold text-slate-900">AW</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Apex Wealth Advisor</h1>
                <p className="text-xs text-slate-500">AI Agent Security Demo</p>
              </div>
            </div>

            {/* Center - Main Tabs */}
            <div className="flex items-center space-x-1 bg-slate-800 rounded-xl p-1">
              {[
                { id: 'agent', label: '🤖 Agent' },
                { id: 'security', label: '🔐 Security Flow' },
                { id: 'guide', label: '📖 Demo Guide' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id as 'agent' | 'security' | 'guide')}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    activeMainTab === tab.id
                      ? 'bg-amber-500 text-slate-900'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-4">
              {activeMainTab === 'agent' && (
                <>
                  <button
                    onClick={() => setShowPromptLibrary(true)}
                    className="px-4 py-2 text-sm font-semibold bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
                  >
                    📚 Prompts
                  </button>
                  <button
                    onClick={handleNewChat}
                    className="px-4 py-2 text-sm font-semibold bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    + New Chat
                  </button>
                </>
              )}
              
              {/* Okta Branding */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.389 0 0 5.389 0 12s5.389 12 12 12 12-5.389 12-12S18.611 0 12 0zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"/>
                </svg>
                <span className="text-xs font-medium text-blue-400">Secured by Okta for AI Agents</span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-400">Online</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{session?.user?.name}</p>
                <p className="text-xs text-slate-500">{session?.user?.email}</p>
              </div>
              <button 
                onClick={() => signOut()} 
                className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Prompt Library Modal */}
      <PromptLibrary
        isOpen={showPromptLibrary}
        onClose={() => setShowPromptLibrary(false)}
        onSelectPrompt={(prompt) => {
          setInput(prompt);
          setShowPromptLibrary(false);
        }}
      />

      {/* Main Content - Tab Panels */}
      <main className="flex-1 overflow-hidden">
        {/* TAB 1: Agent (2-column layout: Chat + Token Cards) */}
        {activeMainTab === 'agent' && (
          <div className="h-full p-2">
            <div className="h-full grid grid-cols-12 gap-2">
              
              {/* LEFT: Chat - 8 cols */}
              <div className="col-span-8 flex flex-col bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id}>
                        {msg.role === 'user' ? (
                          <div className="flex justify-end">
                            <div className="bg-amber-500 text-slate-900 px-4 py-3 rounded-2xl rounded-br-sm max-w-xl">
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs text-amber-800 mt-1">{formatTime(msg.timestamp)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm p-4 max-w-3xl">
                            <p className="text-sm text-slate-200 whitespace-pre-wrap">{msg.content}</p>
                            {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-1">
                                {msg.toolsCalled.map((tool, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-green-900 text-green-300 rounded">
                                    ✓ {tool}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-slate-500 mt-2">{formatTime(msg.timestamp)}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 max-w-md">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-slate-800 p-3 bg-slate-900">
                  <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about clients, portfolios, calendar, transactions..."
                      className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-500 text-sm"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="p-3 bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>

              {/* RIGHT: Token Flow Cards - 4 cols */}
              <div className="col-span-4 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-white">🔐 Token Flow</h3>
                  <p className="text-[10px] text-slate-500">Real-time security token chain</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {/* Step 1: Okta ID Token */}
                  <TokenDisplayCard
                    title="Okta ID Token"
                    token={(session as any)?.idToken}
                    color="border-blue-500/30 bg-blue-900/10"
                    icon="👤"
                    description="User authenticated via Okta SSO"
                  />
                  
                  {/* Step 2: ID-JAG Token */}
                  <TokenDisplayCard
                    title="ID-JAG Token"
                    token={lastXAAInfo?.id_jag_token}
                    color="border-cyan-500/30 bg-cyan-900/10"
                    icon="🔑"
                    description="Identity Assertion Grant - 5min TTL"
                  />
                  
                  {/* Step 3: MCP Token */}
                  <TokenDisplayCard
                    title="MCP Token"
                    token={lastXAAInfo?.mcp_token}
                    color="border-green-500/30 bg-green-900/10"
                    icon="🎫"
                    description="Auth Server token for MCP Server"
                  />
                  
                  {/* Step 4: Vault Token */}
                  <TokenDisplayCard
                    title="Auth0 Vault Token"
                    token={lastTokenVaultInfo?.vault_token}
                    color="border-purple-500/30 bg-purple-900/10"
                    icon="🏦"
                    description="Federated identity (Okta → Auth0)"
                  />
                  
                  {/* Step 5: Google Token */}
                  <TokenDisplayCard
                    title="Google Token"
                    token={lastTokenVaultInfo?.google_token}
                    color="border-red-500/30 bg-red-900/10"
                    icon="📅"
                    description="User's Google Calendar access"
                  />
                  
                  {/* Tools Called */}
                  {lastToolsCalled.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">⚡</span>
                        <span className="font-medium text-white text-sm">Tools Called</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {lastToolsCalled.map((tool, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                            ✓ {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Footer */}
                <div className="px-3 py-2 border-t border-slate-800 bg-slate-950">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">User-Delegated Access</span>
                    <span className="text-[10px] text-green-400">● Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Security Flow */}
        {activeMainTab === 'security' && (
          <SecurityFlowTab 
            session={session}
            auditTrail={auditTrail}
            xaaInfo={lastXAAInfo}
            tokenVaultInfo={lastTokenVaultInfo}
          />
        )}

        {/* TAB 3: Demo Guide */}
        {activeMainTab === 'guide' && (
          <DemoGuideTab />
        )}
      </main>
    </div>
  );
}
