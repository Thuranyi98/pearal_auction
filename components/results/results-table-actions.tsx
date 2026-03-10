"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  exportHref: string;
  tableId: string;
};

export function ResultsTableActions({ exportHref, tableId }: Props) {
  function handlePrint() {
    const table = document.getElementById(tableId);
    if (!table) {
      console.error(`Print failed: table #${tableId} not found`);
      return;
    }

    const html = `
      <html>
        <head>
          <title>Print Results Table</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
          </style>
        </head>
        <body>
          ${table.outerHTML}
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const cleanup = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }
      frameWindow.focus();
      setTimeout(() => {
        frameWindow.print();
        setTimeout(cleanup, 600);
      }, 150);
    };

    const frameDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!frameDoc) {
      cleanup();
      console.error("Print failed: unable to access iframe document");
      return;
    }
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" className="h-9 rounded-full border-slate-200 px-4 text-xs" onClick={handlePrint}>
        Print
      </Button>
      <Button asChild variant="outline" className="h-9 rounded-full border-slate-200 px-4 text-xs">
        <Link href={exportHref}>Export to Excel</Link>
      </Button>
    </div>
  );
}
