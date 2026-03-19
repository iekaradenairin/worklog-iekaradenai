import * as React from "react";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

export function Tabs({ value, onValueChange, className, children }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export function TabsList({ className, style, ...props }: TabsListProps) {
  return (
    <div
      className={cn("grid gap-2", className)}
      style={style}
      {...props}
    />
  );
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({
  value,
  className,
  style,
  children,
  onClick,
  ...props
}: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  const active = ctx?.value === value;

  return (
    <button
      type="button"
      data-state={active ? "active" : "inactive"}
      className={cn(
        "flex items-center gap-2 rounded-[18px] px-4 py-3 text-left transition-all duration-200",
        "border backdrop-blur-[18px]",
        active
          ? "text-[color:var(--accent-teal)] shadow-[0_8px_22px_rgba(56,59,62,0.06)]"
          : "text-[color:var(--text-default)] hover:text-[color:var(--text-strong)]",
        className
      )}
      style={{
        borderColor: active ? "rgba(78, 115, 171, 0.16)" : "rgba(255, 255, 255, 0.45)",
        background: active ? "var(--state-active-bg)" : "rgba(255,255,255,0.34)",
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 22px rgba(56,59,62,0.06)"
          : undefined,
        ...style,
      }}
      onClick={(event) => {
        ctx?.onValueChange(value);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </button>
  );
}