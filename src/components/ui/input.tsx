import * as React from "react";
import { cn } from "@/lib";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn("w-full rounded-xl border border-slate-300 px-3 py-2", className)} {...props} />;
});
