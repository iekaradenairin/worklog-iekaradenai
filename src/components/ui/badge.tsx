import * as React from "react";

type BadgeVariant = "default" | "soft" | "active" | "highlight";

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: BadgeVariant;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const variantStyleMap: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    border: "1px solid rgba(255,255,255,0.70)",
    background: "rgba(255,255,255,0.48)",
    color: "var(--text-default)",
  },
  soft: {
    border: "1px solid rgba(255,255,255,0.70)",
    background: "rgba(255,255,255,0.36)",
    color: "var(--text-muted)",
  },
  active: {
    border: "1px solid rgba(78,115,171,0.16)",
    background: "var(--state-active-bg)",
    color: "var(--state-active-text)",
  },
  highlight: {
    border: "1px solid rgba(207,60,131,0.12)",
    background: "var(--state-focus-bg)",
    color: "var(--state-focus-text)",
  },
};

export function Badge({
  className,
  variant = "default",
  style,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex h-[34px] items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold backdrop-blur-[16px]",
        className
      )}
      style={{
        ...variantStyleMap[variant],
        ...style,
      }}
      {...props}
    />
  );
}