type SectionTitleProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export function SectionTitle({ title, subtitle, rightSlot }: SectionTitleProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>
        {subtitle ? <p className="mt-2 text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {rightSlot ? rightSlot : null}
    </div>
  );
}
