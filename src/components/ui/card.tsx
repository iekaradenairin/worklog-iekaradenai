import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Card({ className, style, ...props }: DivProps) {
  return (
    <div
      className={cn(
        "rounded-[30px] border text-[color:var(--text-strong)] backdrop-blur-[22px]",
        className
      )}
      style={{
        background: "var(--surface)",
        borderColor: "var(--line-soft)",
        boxShadow: "var(--shadow-soft)",
        ...style,
      }}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: DivProps) {
  return <div className={cn("flex flex-col gap-2 p-6", className)} {...props} />;
}

export function CardContent({ className, ...props }: DivProps) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HeadingProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold tracking-tight text-[color:var(--text-strong)]",
        className
      )}
      {...props}
    />
  );
}