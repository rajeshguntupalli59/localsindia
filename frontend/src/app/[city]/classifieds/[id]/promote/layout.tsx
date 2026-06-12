export async function generateStaticParams() {
  return [];
}

export const dynamicParams = true;

export default function PromoteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
