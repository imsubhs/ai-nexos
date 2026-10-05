"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-surface-1 border-border-subtle text-foreground-muted inline-flex h-9 w-fit items-center justify-start rounded-md border p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "text-foreground-secondary focus-visible:border-ring focus-visible:ring-ring/50 hover:text-foreground data-[selected]:bg-surface-3 data-[selected]:text-foreground inline-flex cursor-pointer items-center justify-center rounded-[4px] px-3 py-1 text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 data-[selected]:font-semibold data-[selected]:shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
