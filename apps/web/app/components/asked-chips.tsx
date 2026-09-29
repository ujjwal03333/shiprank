export type AskedChip = {
  id: string;
  label: string;
  state: "present" | "missing";
};

/**
 * Information-only Night Court chips. Never a button or a link.
 */
export function AskedChips({
  chips,
  align = "center",
}: {
  chips: readonly AskedChip[];
  align?: "center" | "start";
}) {
  if (chips.length === 0) return null;
  return (
    <ul
      aria-label="Asked versus shipped"
      className={`flex max-w-full flex-wrap gap-2 ${
        align === "start" ? "justify-start" : "justify-center"
      }`}
    >
      {chips.map((chip) => (
        <li
          key={chip.id}
          className={`rounded-[11px] border border-border px-2.5 py-1 font-mono text-[11px] ${
            chip.state === "missing" ? "text-warning-ink" : "text-ink-muted"
          }`}
        >
          {chip.label} → {chip.state}
        </li>
      ))}
    </ul>
  );
}
