"use client";

import { useEffect } from "react";

export default function AutoRefresh() {
  useEffect(() => {
    const id = window.setInterval(() => {
      window.location.reload();
    }, 10000);

    return () => window.clearInterval(id);
  }, []);

  return null;
}
