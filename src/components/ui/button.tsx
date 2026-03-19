import * as React from "react";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg" | "icon";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-9 px-3 py-2 text-sm",
  lg: "h-12 px-6 py-3 text-sm",
  icon: "h-10 w-10 p-0",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  disabled,
  style,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 select-none disabled:pointer-events-none disabled:opacity-50";

  const variantStyleMap: Record<ButtonVariant, React.CSSProperties> = {
    default: {
      border: "1px solid rgba(78, 115, 171, 0.16)",
      background: "linear-gradient(180deg, rgba(78,115,171,0.92), rgba(78,115,171,0.84))",
      color: "var(--text-on-accent)",
      boxShadow: "0 12px 28px rgba(78,115,171,0.22)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
    },
    outline: {
      border: "1px solid rgba(255,255,255,0.72)",
      background: "rgba(255,255,255,0.56)",
      color: "var(--accent-teal)",
      boxShadow: "0 10px 24px rgba(56,59,62,0.06)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
    },
    ghost: {
      border: "1px solid transparent",
      background: "rgba(255,255,255,0)",
      color: "var(--text-default)",
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        base,
        sizeClasses[size],
        variant === "default" && "hover:brightness-[1.03] active:scale-[0.99]",
        variant === "outline" && "hover:bg-white/70 hover:text-[color:var(--accent-primary)] active:scale-[0.99]",
        variant === "ghost" && "hover:bg-white/50 hover:text-[color:var(--accent-primary)] active:scale-[0.99]",
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