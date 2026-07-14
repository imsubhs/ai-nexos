export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
      <p className="text-gray-500">Read-only view of your active and past projects.</p>
      
      {/* List of projects goes here */}
      <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-gray-500">Loading projects...</p>
      </div>
    </div>
  );
}
