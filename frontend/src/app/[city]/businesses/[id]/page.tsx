import BusinessDetailClient from './BusinessDetailClient';

export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <BusinessDetailClient />;
}
