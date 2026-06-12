export async function generateStaticParams() {
  return [];
}

export const dynamicParams = true;

export default function EditListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
