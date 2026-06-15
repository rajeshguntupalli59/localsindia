import ListingDetailClient from './ListingDetailClient';

export default function ListingPage({ params }: { params: { id: string } }) {
  return <ListingDetailClient id={params.id} />;
}
