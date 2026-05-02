'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { fmt } from '@/lib/api';
import toast from 'react-hot-toast';
import { Save, Settings, MessageCircle, CreditCard, Store, Loader2 } from 'lucide-react';

interface SettingsData {
  store_name: string;
  store_tagline: string;
  support_phone: string;
  support_email: string;
  delivery_fee_kobo: number;
  min_order_kobo: number;
  welcome_message: string;
  order_confirmation_message: string;
  delivery_areas: string;
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 bg-gray-50/50">
        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-emerald-600" />
        </div>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

export default function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<SettingsData>({
    store_name: 'Ojaoba',
    store_tagline: "Nigeria's Freshest Food Marketplace",
    support_phone: '',
    support_email: '',
    delivery_fee_kobo: 100000,
    min_order_kobo: 0,
    welcome_message: '',
    order_confirmation_message: '',
    delivery_areas: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/admin/settings');
      return res.data as SettingsData;
    },
  });

  useEffect(() => {
    if (data) setForm(prev => ({ ...prev, ...data }));
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      await api.patch('/whatsapp/admin/settings', form);
    },
    onSuccess: () => {
      toast.success('Settings saved!');
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const set = (key: keyof SettingsData, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configure your store and chatbot</p>
        </div>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="space-y-6">
        {/* Store */}
        <Section title="Store Information" icon={Store}>
          <Field label="Store Name">
            <input type="text" value={form.store_name} onChange={e => set('store_name', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tagline" hint="Shown in the chatbot welcome message">
            <input type="text" value={form.store_tagline} onChange={e => set('store_tagline', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Delivery Areas" hint="Comma-separated list of areas you deliver to">
            <input type="text" value={form.delivery_areas} onChange={e => set('delivery_areas', e.target.value)} placeholder="Lagos Island, Victoria Island, Lekki..." className={inputCls} />
          </Field>
        </Section>

        {/* Payments */}
        <Section title="Pricing & Payments" icon={CreditCard}>
          <Field label="Delivery Fee" hint="Fixed delivery fee charged on all orders">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₦</span>
              <input
                type="number"
                value={form.delivery_fee_kobo / 100}
                onChange={e => set('delivery_fee_kobo', Math.round(Number(e.target.value) * 100))}
                min={0}
                step={100}
                className={`${inputCls} pl-8`}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Currently: {fmt(form.delivery_fee_kobo)}</p>
          </Field>
          <Field label="Minimum Order Value" hint="Leave at 0 for no minimum">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₦</span>
              <input
                type="number"
                value={form.min_order_kobo / 100}
                onChange={e => set('min_order_kobo', Math.round(Number(e.target.value) * 100))}
                min={0}
                step={100}
                className={`${inputCls} pl-8`}
              />
            </div>
          </Field>
        </Section>

        {/* Support */}
        <Section title="Support Contact" icon={Settings}>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="WhatsApp Support Number" hint="With country code, no +">
              <input
                type="text"
                value={form.support_phone}
                onChange={e => set('support_phone', e.target.value)}
                placeholder="2348012345678"
                className={inputCls}
              />
            </Field>
            <Field label="Support Email">
              <input
                type="email"
                value={form.support_email}
                onChange={e => set('support_email', e.target.value)}
                placeholder="support@ojaoba.com"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* Chatbot messages */}
        <Section title="Chatbot Messages" icon={MessageCircle}>
          <Field label="Welcome Message" hint="First message customers see when they start a chat">
            <textarea
              value={form.welcome_message}
              onChange={e => set('welcome_message', e.target.value)}
              rows={3}
              placeholder="Welcome to Ojaoba! 🛒 Nigeria's freshest food marketplace..."
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Order Confirmation Message" hint="Sent after successful payment">
            <textarea
              value={form.order_confirmation_message}
              onChange={e => set('order_confirmation_message', e.target.value)}
              rows={3}
              placeholder="🎉 Your order has been confirmed! We'll deliver to {address}..."
              className={`${inputCls} resize-none`}
            />
          </Field>
        </Section>
      </div>

      {/* Sticky save for mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-3 rounded-2xl shadow-xl shadow-emerald-200 transition-colors disabled:opacity-50"
        >
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>
    </div>
  );
}
