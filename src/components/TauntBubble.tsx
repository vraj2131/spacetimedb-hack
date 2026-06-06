type TauntBubbleProps = {
  taunt: string | null;
};

export function TauntBubble({ taunt }: TauntBubbleProps) {
  return (
    <section className="match-panel match-panel--rail shrink-0">
      <p className="match-panel__label">Taunt</p>
      <p className="mt-1.5 truncate text-xs font-semibold leading-snug text-yellow-100/90">
        {taunt ?? 'Taunts warming up'}
      </p>
    </section>
  );
}
