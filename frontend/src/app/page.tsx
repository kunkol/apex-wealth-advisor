'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import IdTokenCard from '@/components/IdTokenCard';
import XAAFlowCard from '@/components/XAAFlowCard';
import MCPToolsCard from '@/components/MCPToolsCard';
import PromptLibrary from '@/components/PromptLibrary';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsCalled?: string[];
}

export default function ApexWealthAdvisor() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastXAAInfo, setLastXAAInfo] = useState<any>(null);
  const [lastToolsCalled, setLastToolsCalled] = useState<string[]>([]);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for demo mode on mount
  useEffect(() => {
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    setDemoMode(isDemoMode);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeWelcome = () => {
    const userName = session?.user?.name || (demoMode ? 'Demo Advisor' : 'Advisor');
    setMessages([{
      id: '1',
      content: `Welcome to Apex Wealth Advisor! I can help you with client information, portfolio data, calendar scheduling, and transactions. How can I assist you today?`,
      role: 'assistant',
      timestamp: new Date()
    }]);
  };

  useEffect(() => {
    if ((session || demoMode) && messages.length === 0) {
      initializeWelcome();
    }
  }, [session, demoMode]);

  const handleNewChat = () => {
    setMessages([]);
    setLastXAAInfo(null);
    setLastToolsCalled([]);
    setTimeout(() => initializeWelcome(), 100);
  };

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          session_id: session?.user?.email || 'demo-session'
        })
      });

      const data = await response.json();
      setIsTyping(false);

      if (data.xaa_info) {
        setLastXAAInfo(data.xaa_info);
      }
      
      if (data.tools_called?.length > 0) {
        setLastToolsCalled(prev => [...new Set([...prev, ...data.tools_called])]);
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

  // Login screen - Clean, no tech details
  if (!session && !demoMode) {
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
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold py-4 px-8 rounded-2xl transition-all mb-3"
              >
                Sign in with Okta
              </button>

              <button
                onClick={() => {
                  localStorage.setItem('demoMode', 'true');
                  window.location.reload();
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-xl transition-all"
              >
                🎮 Try Demo Mode
              </button>

              <p className="text-xs text-slate-600 mt-6">Demo mode uses mock data</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Application - 3 Column Layout
  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header - Clean, minimal */}
      <header className="border-b border-slate-800 bg-slate-900 flex-shrink-0">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-slate-900">AW</span>
              </div>
              <div>
                <h1 className="text-base font-semibold text-white">Apex Wealth Advisor</h1>
                <p className="text-xs text-slate-500">Powered by AI • Secure • Confidential</p>
              </div>
            </div>

            {/* Center - Prompt Library */}
            <button
              onClick={() => setShowPromptLibrary(!showPromptLibrary)}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg transition-all text-sm ${
                showPromptLibrary ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>📚</span>
              <span>Prompt Library</span>
            </button>

            {/* Right - User & Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-slate-400">Online</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {demoMode ? 'Demo Advisor' : session?.user?.name}
                </p>
                <p className="text-xs text-slate-500">
                  {demoMode ? 'demo@apex.com' : session?.user?.email}
                </p>
              </div>
              <button 
                onClick={() => {
                  if (demoMode) {
                    localStorage.removeItem('demoMode');
                    setDemoMode(false);
                    setMessages([]);
                  } else {
                    signOut();
                  }
                }} 
                className="px-3 py-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                {demoMode ? 'Exit Demo' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Prompt Library Overlay */}
      {showPromptLibrary && (
        <div className="absolute top-12 left-0 right-0 z-50 px-4 py-2">
          <PromptLibrary
            isOpen={showPromptLibrary}
            onToggle={() => setShowPromptLibrary(false)}
            onSelectPrompt={(prompt) => {
              setInput(prompt);
              setShowPromptLibrary(false);
            }}
          />
        </div>
      )}

      {/* Main 3-Column Grid */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-12 divide-x divide-slate-800">
          
          {/* LEFT: Chat - 50% (6 cols) */}
          <div className="col-span-6 flex flex-col bg-white">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="bg-amber-500 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-md">
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs text-amber-200 mt-1">{formatTime(msg.timestamp)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md p-4 max-w-2xl shadow-sm">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.content}</p>
                        {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                            {msg.toolsCalled.map((tool, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                {tool}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2">{formatTime(msg.timestamp)}</p>
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 max-w-md shadow-sm">
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
            <div className="border-t border-slate-200 p-3 bg-white">
              <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about clients, portfolios, transactions..."
                  className="flex-1 p-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 placeholder-slate-400 text-sm"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* CENTER: Architecture Visual - 25% (3 cols) */}
          <div className="col-span-3 bg-slate-900 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-4">Security Architecture</h3>
            
            {/* Visual Flow */}
            <div className="space-y-3">
              {/* User */}
              <div className="flex items-center justify-center">
                <div className="px-4 py-2 bg-green-600 rounded-lg text-white text-xs font-medium">
                  {demoMode ? 'Demo Advisor' : (session?.user?.name || 'User')} ✓ Logged In
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="w-0.5 h-6 bg-amber-500"></div>
              </div>

              {/* Okta */}
              <div className="flex items-center justify-center">
                <div className="px-6 py-3 bg-blue-600 rounded-xl text-white text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <span className="font-bold text-sm">OKTA</span>
                  </div>
                  <div className="flex space-x-1 justify-center">
                    <span className="text-xs bg-blue-500 px-2 py-0.5 rounded">SSO</span>
                    <span className="text-xs bg-blue-500 px-2 py-0.5 rounded">XAA</span>
                    <span className="text-xs bg-blue-500 px-2 py-0.5 rounded">ID-JAG</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-0.5 h-6 bg-amber-500"></div>
              </div>

              {/* AI Agent */}
              <div className="flex items-center justify-center">
                <div className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <span className="text-lg">🤖</span>
                    <span className="font-bold text-slate-900">Buffett AI Agent</span>
                  </div>
                  <p className="text-xs text-slate-800">Claude + Tool Orchestration</p>
                </div>
              </div>

              <div className="flex justify-center items-center space-x-8">
                <div className="w-12 h-0.5 bg-slate-600"></div>
                <div className="w-12 h-0.5 bg-slate-600"></div>
              </div>

              {/* Backend Services */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800 rounded-lg text-center border border-slate-700">
                  <div className="text-lg mb-1">🏢</div>
                  <div className="text-xs font-medium text-white">Internal MCP</div>
                  <div className="text-xs text-slate-400">Portfolio Server</div>
                  <div className="mt-2">
                    <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white">Okta XAA</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg text-center border border-slate-700">
                  <div className="text-lg mb-1">☁️</div>
                  <div className="text-xs font-medium text-white">External SaaS</div>
                  <div className="text-xs text-slate-400">Google Calendar</div>
                  <div className="mt-2">
                    <span className="text-xs bg-orange-600 px-2 py-0.5 rounded text-white">Token Vault</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Real Token Flow - 25% (3 cols) - Like Indranil's */}
          <div className="col-span-3 bg-slate-900 overflow-y-auto">
            <div className="p-2 space-y-2">
              {/* ID Token Card */}
              <IdTokenCard idToken={(session as any)?.idToken || ''} />
              
              {/* MCP Flow Card */}
              <MCPToolsCard toolsCalled={lastToolsCalled} mcpServer="apex-wealth-mcp" />
              
              {/* XAA Flow Card with real tokens */}
              <XAAFlowCard xaaInfo={lastXAAInfo} toolsCalled={lastToolsCalled} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
