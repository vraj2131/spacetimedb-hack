type CountdownOverlayProps = {
  label: string;
};

export function CountdownOverlay({ label }: CountdownOverlayProps) {
  return (
    <div className="rounded-lg border border-teal-300 bg-teal-50 px-4 py-3 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Round timer</p>
      <p className="text-3xl font-black text-slate-950">{label}</p>
    </div>
  );
}
