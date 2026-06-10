'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Store, Star, MapPin, Phone, Plus, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Business } from '@/lib/types';
import SiteHeader from '@/components/site-header/SiteHeader';
import SiteFooter from '@/components/site-footer/SiteFooter';
import BottomNav from '@/components/bottom-nav/BottomNav';

function BusinessCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
      <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
      <div className="h-4 bg-slate-200 rounded w-3/4" />
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
        />
      ))}
    </div>
  );
}

function BusinessCard({ business, citySlug }: { business: Business; citySlug: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-900">{business.name}</h3>
          {business.verified && (
            <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
          )}
        </div>
      </div>

      {business.avg_rating && business.review_count > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <StarRating rating={business.avg_rating} />
          <span className="text-xs text-slate-500">
            {business.avg_rating.toFixed(1)} ({business.review_count})
          </span>
        </div>
      )}

      {business.address && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{business.address}</span>
        </div>
      )}

      {business.description && (
        <p className="text-sm text-slate-600 line-clamp-2 mb-4">{business.description}</p>
      )}

      <div className="flex gap-2 mt-auto">
        <Link
          href={`/${citySlug}/businesses/${business.id}`}
          className="flex-1 text-center text-sm font-semibold py-2 rounded-xl border-2 transition-colors"
          style={{ borderColor: 'var(--li-primary)', color: 'var(--li-primary)' }}
        >
          View Profile
        </Link>
        {business.whatsapp_url && (
          <a
            href={business.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: '#25D366' }}
          >
            <Phone className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function BusinessesPage() {
  const params = useParams();
  const citySlug = params.city as string;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityName, setCityName] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [bizData, cityData] = await Promise.all([
          api.businesses.list(citySlug),
          api.cities.get(citySlug),
        ]);
        setBusinesses(bizData);
        setCityName(cityData.name);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [citySlug]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--li-page-bg)' }}>
      <SiteHeader />

      <div className="page-wrap py-8 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--li-text)' }}>
              Businesses in {cityName || citySlug}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Find trusted local businesses</p>
          </div>
          <Link
            href={`/${citySlug}/businesses/add`}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: 'var(--li-primary)' }}
          >
            <Plus className="w-4 h-4" />
            Add Business
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => <BusinessCardSkeleton key={i} />)}
          </div>
        ) : businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Store className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No businesses listed yet</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">Add your business to reach local customers!</p>
            <Link
              href={`/${citySlug}/businesses/add`}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white"
              style={{ background: 'var(--li-primary)' }}
            >
              Add Your Business →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {businesses.map(biz => (
              <BusinessCard key={biz.id} business={biz} citySlug={citySlug} />
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
      <BottomNav citySlug={citySlug} />
    </div>
  );
}
