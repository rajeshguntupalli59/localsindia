import ListingDetailClient from './ListingDetailClient';

export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <ListingDetailClient />;
}
