import ListingDetailClient from './ListingDetailClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function ListingPage() {
  return <ListingDetailClient />;
}
