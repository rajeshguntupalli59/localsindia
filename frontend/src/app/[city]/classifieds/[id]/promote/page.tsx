import PromoteClient from './PromoteClient';

export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <PromoteClient />;
}
