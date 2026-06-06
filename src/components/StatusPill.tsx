type StatusPillProps = {
  label: string;
  tone?: 'neutral' | 'good' | 'warning' | 'danger';
};

const toneClass = {
  neutral: 'border-slate-300 bg-white text-slate-700',
  good: 'border-teal-300 bg-teal-50 text-teal-800',
  warning: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  danger: 'border-red-300 bg-red-50 text-red-800',
};

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-wide ${toneClass[tone]}`}
    >
      {label}
    </span>
  );
}
