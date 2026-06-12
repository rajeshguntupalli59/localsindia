export async function generateStaticParams() {
  return [];
}

export const dynamicParams = true;

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
