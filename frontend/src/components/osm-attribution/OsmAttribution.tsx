// Required by the ODbL licence wherever OpenStreetMap-sourced business data is shown.
export default function OsmAttribution({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[11px] text-slate-400 ${className}`}>
      Business details from{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
        © OpenStreetMap contributors
      </a>
      , available under the ODbL.
    </p>
  );
}
