'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Megaphone, AlertTriangle, Send, Users, CheckCircle } from 'lucide-react';

export default function BroadcastPage() {
  const [message, setMessage] = useState('');
  const [targetAll, setTargetAll] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const broadcast = useMutation({
    mutationFn: async () => {
      const res = await api.post('/whatsapp/admin/broadcast', {
        message,
        target: targetAll ? 'all' : 'active',
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Broadcast sent to ${data.sent} contacts! (${data.failed} failed)`);
      setMessage('');
      setConfirmed(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Broadcast failed');
    },
  });

  const charCount = message.length;
  const isReady = message.trim().length >= 10 && confirmed;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Broadcast Message</h1>
        <p className="text-gray-500 text-sm mt-0.5">Send a WhatsApp message to your customers</p>
      </div>

      {/* Warning */}
      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Use broadcasts responsibly</p>
          <p>WhatsApp limits business messaging. Excessive broadcasts may result in your number being flagged. Only message customers who have previously interacted with your chatbot.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        {/* Target */}
        <div>
          <label className="block font-semibold text-gray-900 mb-3">Target Audience</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: true, label: 'All Customers', sub: 'Everyone who has messaged the chatbot', icon: Users },
              { value: false, label: 'Active (30 days)', sub: 'Customers active in the last 30 days', icon: CheckCircle },
            ].map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setTargetAll(opt.value)}
                className={`flex gap-3 p-4 rounded-xl border-2 text-left transition-all ${targetAll === opt.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <opt.icon className={`w-5 h-5 mt-0.5 shrink-0 ${targetAll === opt.value ? 'text-emerald-600' : 'text-gray-400'}`} />
                <div>
                  <p className={`font-semibold text-sm ${targetAll === opt.value ? 'text-emerald-900' : 'text-gray-700'}`}>{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-semibold text-gray-900">Message</label>
            <span className={`text-xs ${charCount > 1000 ? 'text-red-500' : 'text-gray-400'}`}>{charCount}/1000</span>
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, 1000))}
            rows={5}
            placeholder={`Hi! 👋 We have exciting news from Ojaoba...\n\nUse emojis to make your message engaging. Include a clear call to action.`}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Tip: Keep messages concise. Include a clear value proposition or offer.
          </p>
        </div>

        {/* Preview */}
        {message && (
          <div>
            <label className="block font-semibold text-gray-900 mb-2">Preview</label>
            <div className="bg-[#e5ddd5] rounded-2xl p-4">
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 max-w-xs shadow-sm">
                <p className="text-sm text-gray-800 whitespace-pre-line">{message}</p>
                <p className="text-xs text-gray-400 text-right mt-1">
                  {new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-emerald-600"
          />
          <span className="text-sm text-gray-600">
            I understand this will send a WhatsApp message to {targetAll ? 'all' : 'recently active'} customers and confirm this is a valuable, non-spammy message.
          </span>
        </label>

        {/* Send Button */}
        <button
          onClick={() => broadcast.mutate()}
          disabled={!isReady || broadcast.isPending}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-base transition-colors"
        >
          {broadcast.isPending ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
          ) : (
            <><Send className="w-5 h-5" />Send Broadcast</>
          )}
        </button>
      </div>
    </div>
  );
}
