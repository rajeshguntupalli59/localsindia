import BottomNav from '@/components/bottom-nav/BottomNav';

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
