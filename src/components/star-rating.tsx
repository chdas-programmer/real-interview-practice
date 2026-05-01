import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

export function StarRating({ value, onChange, size = 20, readOnly, className }: Props) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={cn(
            "transition",
            !readOnly && "hover:scale-110 cursor-pointer",
            readOnly && "cursor-default"
          )}
        >
          <Star
            size={size}
            className={cn(
              n <= value
                ? "fill-[color:var(--accent-warm)] text-[color:var(--accent-warm)]"
                : "text-[color:var(--ink-soft)]"
            )}
          />
        </button>
      ))}
    </div>
  );
}
