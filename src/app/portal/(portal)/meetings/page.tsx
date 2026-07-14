export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Meetings</h2>
      <p className="text-gray-500">View upcoming meetings and past notes.</p>
      
      <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-gray-500">Loading meetings...</p>
      </div>
    </div>
  );
}
