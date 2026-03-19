import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-[20px] px-4 py-3 text-[color:var(--text-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-all outline-none",
          "placeholder:text-[color:rgba(82,96,106,0.58)]",
          "focus:border-[color:var(--line-strong)] focus:bg-white/60",
          className
        )}
        style={{
          border: "1px solid rgba(255,255,255,0.70)",
          background: "rgba(255,255,255,0.42)",
          ...style,
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";