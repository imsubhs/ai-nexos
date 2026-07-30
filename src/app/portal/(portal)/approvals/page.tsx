export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Approvals</h2>
      <p className="text-gray-500">Manage your pending and past approvals.</p>

      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500">Loading approvals...</p>
      </div>
    </div>
  );
}
