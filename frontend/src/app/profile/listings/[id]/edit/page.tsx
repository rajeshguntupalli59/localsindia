import EditListingClient from './EditListingClient';

export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <EditListingClient />;
}
