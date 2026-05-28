import clsx from "clsx";

interface Props {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: Props) {
  if (score === null) {
    return (
      <span className="inline-block bg-gray-100 text-gray-400 rounded px-2 py-0.5 text-xs font-medium">
        Unscored
      </span>
    );
  }

  const colour =
    score >= 80
      ? "bg-emerald-100 text-emerald-800"
      : score >= 60
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-700";

  const sizeClass =
    size === "lg" ? "text-2xl px-4 py-1 rounded-lg" : size === "sm" ? "text-xs px-2 py-0.5 rounded" : "text-sm px-2.5 py-0.5 rounded";

  return (
    <span className={clsx("inline-block font-semibold", colour, sizeClass)}>
      {score}
    </span>
  );
}
