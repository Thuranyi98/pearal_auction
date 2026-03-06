"use client";

import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return <Sonner richColors position="top-right" toastOptions={{ className: "text-sm" }} {...props} />;
}
