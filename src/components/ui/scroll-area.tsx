import * as React from "react";

type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement>;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ScrollArea({ className, style, children, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn(
        "overflow-auto rounded-[24px] border backdrop-blur-[18px]",
        className
      )}
      style={{
        borderColor: "rgba(255,255,255,0.62)",
        background: "rgba(255,255,255,0.28)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.30)",
        scrollbarWidth: "thin",
        ...style,
      }}
      {...props}
    >
      <style>{`
        .glass-scrollarea::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .glass-scrollarea::-webkit-scrollbar-track {
          background: transparent;
        }
        .glass-scrollarea::-webkit-scrollbar-thumb {
          background: rgba(95, 126, 184, 0.20);
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .glass-scrollarea::-webkit-scrollbar-thumb:hover {
          background: rgba(95, 126, 184, 0.30);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
      <div className="glass-scrollarea h-full w-full">
        {children}
      </div>
    </div>
  );
}