import * as React from "react";
import { cn } from "@/lib";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref
) {
  return <textarea ref={ref} className={cn("w-full rounded-xl border border-slate-300 px-3 py-2", className)} {...props} />;
});
