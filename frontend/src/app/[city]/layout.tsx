import BottomNav from '@/components/bottom-nav/BottomNav';
import { getAllCityParams } from '@/lib/static-params';

export async function generateStaticParams() {
  return getAllCityParams();
}

export const dynamicParams = true;

export default function CityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { city: string };
}) {
  return (
    <>
      <div className="pb-16 md:pb-0">{children}</div>
      <BottomNav citySlug={params.city} />
    </>
  );
}
