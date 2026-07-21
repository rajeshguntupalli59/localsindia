'use client';

import { useEffect, useState, useCallback } from 'react';
import { Megaphone, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/empty-state/EmptyState';
import type { City } from '@/lib/types';

interface BannerRow {
  id: string;
  city_id: string;
  advertiser_name: string;
  image_url: string;
  link_url: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const EMPTY_FORM = {
  city_id: '',
  advertiser_name: '',
  image_url: '',
  link_url: '',
  start_date: '',
  end_date: '',
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchAll = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const [bannersRes, citiesRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/banners`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/v1/cities`),
      ]);
      if (!bannersRes.ok || !citiesRes.ok) throw new Error();
      setBanners(await bannersRes.json());
      setCities(await citiesRes.json());
    } catch {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const isActive = (b: BannerRow) => {
    const today = new Date().toISOString().slice(0, 10);
    return b.start_date <= today && b.end_date >= today;
  };

  const cityName = (id: string) => cities.find(c => c.id === id)?.name ?? id;

  const createBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.city_id || !form.advertiser_name || !form.image_url || !form.link_url || !form.start_date || !form.end_date) {
      toast.error('Fill in every field');
      return;
    }
    if (form.end_date < form.start_date) {
      toast.error('End date must be on or after start date');
      return;
    }
    setCreating(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setBanners(prev => [created, ...prev]);
      setForm(EMPTY_FORM);
      toast.success('Banner created');
    } catch {
      toast.error('Failed to create banner');
    } finally {
      setCreating(false);
    }
  };

  const deleteBanner = async (b: BannerRow) => {
    const confirmed = window.confirm(`Remove the ${b.advertiser_name} banner?`);
    if (!confirmed) return;
    setDeletingId(b.id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/v1/admin/banners/${b.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setBanners(prev => prev.filter(x => x.id !== b.id));
      toast.success('Banner removed');
    } catch {
      toast.error('Failed to remove banner');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">City Banners</h1>
        <p className="text-sm text-muted-foreground">
          {banners.length} total · {banners.filter(isActive).length} active now
        </p>
      </div>

      <form onSubmit={createBanner} className="bg-white rounded-xl border p-4 mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
        <select
          value={form.city_id}
          onChange={e => setForm(f => ({ ...f, city_id: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm col-span-2 md:col-span-1"
        >
          <option value="">Select city</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name} ({c.state})</option>)}
        </select>
        <input
          type="text"
          placeholder="Advertiser name"
          value={form.advertiser_name}
          onChange={e => setForm(f => ({ ...f, advertiser_name: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="url"
          placeholder="Image URL"
          value={form.image_url}
          onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="url"
          placeholder="Link URL (where the banner sends visitors)"
          value={form.link_url}
          onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm col-span-2 md:col-span-1"
        />
        <input
          type="date"
          value={form.start_date}
          onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={form.end_date}
          onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 col-span-2 md:col-span-1"
          style={{ background: 'var(--li-primary)' }}
        >
          <Plus className="w-4 h-4" /> {creating ? 'Adding…' : 'Add banner'}
        </button>
      </form>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <EmptyState icon={Megaphone} title="No banners yet" description="Assign a banner to a city using the form above" />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Advertiser</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">City</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Dates</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {banners.map(b => {
                const active = isActive(b);
                return (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{b.advertiser_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cityName(b.city_id)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {active ? 'Active' : b.end_date < new Date().toISOString().slice(0, 10) ? 'Expired' : 'Scheduled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{b.start_date} → {b.end_date}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteBanner(b)}
                        disabled={deletingId === b.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
