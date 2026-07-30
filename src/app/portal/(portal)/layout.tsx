import { ReactNode } from "react";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-40 border-b bg-white px-6 py-4 dark:bg-gray-800">
        <h1 className="text-xl font-semibold">Client Portal</h1>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-6">{children}</main>
    </div>
  );
}
