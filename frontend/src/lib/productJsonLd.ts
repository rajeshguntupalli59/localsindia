import type { ListingReview } from './types';

// schema.org AggregateRating for a listing's Product JSON-LD, built only from
// real user reviews. Returns null when there are none — Google penalises
// made-up ratings, so a listing with no reviews simply omits the field.
export function aggregateRating(reviews: Pick<ListingReview, 'rating'>[]) {
  const rated = reviews.filter((r) => r.rating >= 1 && r.rating <= 5);
  if (rated.length === 0) return null;
  const avg = rated.reduce((sum, r) => sum + r.rating, 0) / rated.length;
  return {
    '@type': 'AggregateRating',
    ratingValue: Math.round(avg * 10) / 10,
    reviewCount: rated.length,
    bestRating: 5,
    worstRating: 1,
  };
}
