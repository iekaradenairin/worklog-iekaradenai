import * as React from "react";
import { cn } from "@/lib";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", type = "button", ...props },
  ref
) {
  const variantClass =
    variant === "outline"
      ? "border border-slate-300 bg-white text-slate-900"
      : variant === "ghost"
        ? "bg-transparent text-slate-900"
        : "bg-slate-900 text-white";

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClass,
        className
      )}
      {...props}
    />
  );
});
