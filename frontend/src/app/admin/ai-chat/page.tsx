'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MessageCircle, Search, Clock, User, CheckCircle2,
  Send, X, RefreshCw, Bot, BarChart3, Inbox, CheckCheck,
  ChevronRight,
} from 'lucide-react';

const AI_URL = process.env.NEXT_PUBLIC_AI_CHAT_URL || 'https://www.kreative-haven.com';
const AI_KEY = process.env.NEXT_PUBLIC_AI_CHAT_KEY || '';

const chatApi = axios.create({ baseURL: `${AI_URL}/api/tenant/ext/${AI_KEY}` });

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
}

interface Conversation {
  id: string;
  visitorId: string;
  name: string | null;
  email: string | null;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  channel: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  _count: { messages: number };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name: string | null, email: string | null) {
  const src = name || email || '?';
  return src.slice(0, 2).toUpperCase();
}

export default function AiChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, recent: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<Conversation | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const params: any = { limit: 40 };
      if (statusFilter) params.status = statusFilter;
      const res = await chatApi.get('/conversations', { params });
      setConversations(res.data.conversations || []);
      setTotal(res.data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await chatApi.get('/stats');
      setStats(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchConversations();
    fetchStats();
    const iv = setInterval(() => { fetchConversations(); fetchStats(); }, 20000);
    return () => clearInterval(iv);
  }, [statusFilter]);

  const openThread = async (convId: string) => {
    setSelectedId(convId);
    setThreadLoading(true);
    try {
      const res = await chatApi.get(`/conversations/${convId}/messages`);
      setThread(res.data);
    } catch { /* ignore */ }
    setThreadLoading(false);
  };

  useEffect(() => {
    if (selectedId) openThread(selectedId);
    const iv = setInterval(() => { if (selectedId) openThread(selectedId); }, 5000);
    return () => clearInterval(iv);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  const sendReply = async () => {
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    try {
      await chatApi.post(`/conversations/${selectedId}/reply`, { content: reply.trim() });
      setReply('');
      await openThread(selectedId);
    } catch { /* ignore */ }
    setSending(false);
  };

  const resolveConv = async (convId: string) => {
    try {
      await chatApi.put(`/conversations/${convId}/status`, { status: 'RESOLVED' });
      fetchConversations();
      if (selectedId === convId) openThread(convId);
    } catch { /* ignore */ }
  };

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.messages?.[0]?.content || '').toLowerCase().includes(q)
    );
  });

  const selected = filtered.find(c => c.id === selectedId);

  if (!AI_KEY) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-96 text-center">
        <Bot className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="font-bold text-gray-700 mb-2">AI Chat not configured</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_AI_CHAT_KEY</code> and{' '}
          <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_AI_CHAT_URL</code> to your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Bot className="w-6 h-6 text-emerald-600" />
              AI Chat Sessions
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Customer conversations via the AI chat widget</p>
          </div>
          <button
            onClick={() => { fetchConversations(); fetchStats(); }}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: BarChart3, color: 'text-gray-600 bg-gray-50' },
            { label: 'Open', value: stats.open, icon: Inbox, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Resolved', value: stats.resolved, icon: CheckCheck, color: 'text-blue-600 bg-blue-50' },
            { label: 'Last 30d', value: stats.recent, icon: Clock, color: 'text-purple-600 bg-purple-50' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-black text-gray-900 leading-none">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body — split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: conversation list */}
        <div className="w-80 lg:w-96 border-r border-gray-100 bg-white flex flex-col shrink-0 overflow-hidden">
          {/* Search + filter */}
          <div className="p-3 space-y-2 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-1.5">
              {[['', 'All'], ['OPEN', 'Open'], ['RESOLVED', 'Resolved']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setStatusFilter(val); setSelectedId(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === val ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 flex items-start gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-32" />
                    <div className="h-3 bg-gray-100 rounded w-48" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              filtered.map(conv => {
                const lastMsg = conv.messages?.[0];
                const isActive = Date.now() - new Date(conv.updatedAt).getTime() < 10 * 60 * 1000;
                const isSelected = conv.id === selectedId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openThread(conv.id)}
                    className={`w-full p-4 flex items-start gap-3 text-left transition-colors ${
                      isSelected ? 'bg-emerald-50 border-l-2 border-emerald-500' : 'hover:bg-gray-50/70'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {initials(conv.name, conv.email)}
                      </div>
                      {isActive && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {conv.name || conv.email || 'Visitor'}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0">{timeAgo(conv.updatedAt)}</span>
                      </div>
                      {lastMsg && (
                        <p className="text-xs text-gray-500 truncate">
                          {lastMsg.role === 'user' ? '' : '🤖 '}
                          {lastMsg.content}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          conv.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {conv.status}
                        </span>
                        <span className="text-xs text-gray-400">{conv._count.messages} msgs</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: thread */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <MessageCircle className="w-14 h-14 opacity-15" />
              <p className="text-sm font-medium">Select a conversation to view</p>
            </div>
          ) : threadLoading && !thread ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : thread ? (
            <>
              {/* Thread header */}
              <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {initials(thread.name, thread.email)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {thread.name || thread.email || 'Visitor'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {thread.email && thread.name ? thread.email : `Started ${timeAgo(thread.createdAt)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    thread.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {thread.status}
                  </span>
                  {thread.status === 'OPEN' && (
                    <button
                      onClick={() => resolveConv(thread.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {thread.messages.map(msg => {
                  const isUser = msg.role === 'user';
                  const isAgent = msg.role === 'agent';
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isUser ? '' : 'flex-row-reverse'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isUser ? 'bg-gray-200 text-gray-600' : isAgent ? 'bg-emerald-600 text-white' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {isUser ? <User className="w-3.5 h-3.5" /> : isAgent ? 'ME' : <Bot className="w-3.5 h-3.5" />}
                      </div>
                      <div className={`max-w-xs lg:max-w-sm xl:max-w-md rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                          : isAgent
                          ? 'bg-emerald-600 text-white rounded-br-sm'
                          : 'bg-blue-50 border border-blue-100 text-gray-800 rounded-br-sm'
                      }`}>
                        {msg.fileUrl ? (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="underline text-xs">
                            📎 {msg.fileName || 'Attachment'}
                          </a>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <p className={`text-xs mt-1 ${isUser ? 'text-gray-400' : isAgent ? 'text-emerald-200' : 'text-blue-400'}`}>
                          {timeAgo(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Reply bar */}
              {thread.status === 'OPEN' && (
                <div className="bg-white border-t border-gray-100 p-4">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder="Type a reply... (Enter to send)"
                      rows={2}
                      className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!reply.trim() || sending}
                      className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 ml-1">
                    Replies appear in the chat widget on the customer's screen in real-time.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
