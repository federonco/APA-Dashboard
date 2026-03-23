"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function Select<Value = string>({
  modal = false,
  ...props
}: SelectPrimitive.Root.Props<Value, false>) {
  return <SelectPrimitive.Root modal={modal} data-slot="select" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        /* w-fit: match native <select> — do not stretch in flex rows (avoid w-full) */
        "inline-flex h-9 min-h-9 w-fit max-w-full shrink-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-[var(--token-border)] bg-[var(--token-card)] px-3 py-2 text-left text-sm font-medium text-[#374151] shadow-none outline-none transition-[background-color,border-color,color] duration-150",
        "hover:border-[#E5E7EB] hover:bg-[#F7F7F7]",
        "focus-visible:border-[#D1D5DB] focus-visible:ring-2 focus-visible:ring-[#9CA3AF]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--token-card)]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
        "data-[open]:border-[#E5E7EB] data-[open]:bg-[#F3F4F6]",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        data-slot="select-icon"
        className="pointer-events-none shrink-0 text-[#6B7280]"
      >
        <ChevronDown className="size-3.5 opacity-90" strokeWidth={2} aria-hidden />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({
  className,
  ...props
}: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("min-w-0 truncate whitespace-nowrap", className)}
      {...props}
    />
  );
}

type SelectContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Popup>,
  "children"
> &
  Pick<
    Partial<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Positioner>>,
    "side" | "align" | "sideOffset" | "alignOffset"
  > & {
    children?: React.ReactNode;
  };

function SelectContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  alignOffset = 0,
  ...popupProps
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="isolate z-50 outline-none"
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-[var(--available-height)] min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-[10px] border border-[#E5E7EB] bg-[#F3F4F6] p-2 text-sm text-[#4B5563] shadow-[0_4px_16px_rgba(0,0,0,0.07)] outline-none",
            "transition-[opacity,transform] duration-150 data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95 data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95",
            className
          )}
          {...popupProps}
        >
          <SelectPrimitive.List
            data-slot="select-list"
            className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-0.5 text-[#4B5563] outline-none"
          >
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={(state) =>
        cn(
          "relative flex w-full cursor-pointer select-none rounded-lg px-3 py-2 text-left text-sm font-medium text-[#4B5563] outline-none transition-[background-color,color] duration-150",
          "focus-visible:outline-none focus-visible:ring-0",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
          /* Neutral greys only — no cool/slate tints */
          state.selected && "bg-[#D1D5DB] text-[#111827]",
          !state.selected && state.highlighted && "bg-[#E5E7EB] text-[#4B5563]",
          typeof className === "function" ? className(state) : className
        )
      }
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
