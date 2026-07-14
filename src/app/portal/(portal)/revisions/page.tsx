export default function RevisionsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Revisions</h2>
      <p className="text-gray-500">Track requested revisions and their status.</p>
      
      <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-gray-500">Loading revisions...</p>
      </div>
    </div>
  );
}
