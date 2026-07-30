export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
      <p className="text-gray-500">
        Read-only view of your active and past projects.
      </p>

      {/* List of projects goes here */}
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500">Loading projects...</p>
      </div>
    </div>
  );
}
