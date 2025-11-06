export const ProjectOverview = ({ activeProject }) => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Project Overview</h2>
      {activeProject ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{activeProject.name}</h3>
            <span className="text-sm text-gray-500">
              {activeProject.per_complete}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-400 to-blue-400 h-2 rounded-full"
              style={{ width: `${activeProject.per_complete}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="font-medium">
                {new Date(activeProject.start_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">End Date</p>
              <p className="font-medium">
                {new Date(activeProject.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No active project</p>
      )}
    </div>
  );