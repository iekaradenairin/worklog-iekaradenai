import * as React from "react";
import * as ReactDOM from "react-dom";
import { cn } from "@/lib";

type DialogContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

export function Dialog({ open, onOpenChange, children }: React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void; }>) {
  return <DialogContext.Provider value={{ open: Boolean(open), onOpenChange }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ asChild, children }: React.PropsWithChildren<{ asChild?: boolean }>) {
  const ctx = React.useContext(DialogContext);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (event: React.MouseEvent) => {
        children.props.onClick?.(event);
        ctx?.onOpenChange?.(true);
      }
    });
  }
  return <button type="button" onClick={() => ctx?.onOpenChange?.(true)}>{children}</button>;
}

export function DialogContent({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  const ctx = React.useContext(DialogContext);
  if (!ctx?.open) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => ctx.onOpenChange?.(false)}>
      <div className={cn("max-h-[90vh] w-full overflow-auto rounded-2xl bg-white p-6 shadow-xl", className)} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}
