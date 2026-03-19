import * as React from "react";
import { cn } from "@/lib";

type TabsContextValue = {
  value: string;
  onValueChange?: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({ value, onValueChange, className, children }: React.PropsWithChildren<{ value: string; onValueChange?: (value: string) => void; className?: string; }>) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

export function TabsTrigger({ value, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = React.useContext(TabsContext);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center rounded-xl px-3 py-2 transition",
        active ? "border border-violet-200 bg-violet-50 text-violet-700 shadow-sm" : "border border-slate-200 bg-slate-50 text-slate-700",
        className
      )}
      onClick={() => ctx?.onValueChange?.(value)}
      data-state={active ? "active" : "inactive"}
      {...props}
    >
      {children}
    </button>
  );
}
