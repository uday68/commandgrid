import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { 
  ClockIcon, 
  CalendarIcon, 
  BriefcaseIcon, 
  ListBulletIcon 
} from "@heroicons/react/24/outline";
import { format, startOfWeek, eachDayOfInterval } from 'date-fns';

Chart.register(...registerables);

export const TimeTracker = ({ 
  timeEntries,
  projects,
  tasks,
  handleTimeSubmit,
  newTimeEntry,
  setNewTimeEntry,
  isLoading,
  error,
  successMessage
}) => {
  // Generate week days for chart labels
  const currentWeek = eachDayOfInterval({
    start: startOfWeek(new Date()),
    end: new Date()
  });

  // Process time entries for chart
  const chartData = currentWeek.map(date => {
    const entries = timeEntries.filter(entry => 
      format(new Date(entry.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return entries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <ClockIcon className="w-7 h-7 text-indigo-600" />
          Time Management
        </h2>
        <div className="bg-indigo-50 px-3 py-1 rounded-lg text-indigo-700 text-sm font-medium">
          Total: {timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0)}h
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-700">Weekly Overview</h3>
          <span className="text-sm text-gray-500">
            {format(currentWeek[0], 'MMM dd')} - {format(currentWeek[6], 'MMM dd')}
          </span>
        </div>
        <Bar
          data={{
            labels: currentWeek.map(date => format(date, 'EEE')),
            datasets: [{
              label: 'Hours Worked',
              data: chartData,
              backgroundColor: 'rgba(79, 70, 229, 0.1)',
              borderColor: '#4f46e5',
              borderWidth: 1.5,
              borderRadius: 8,
              hoverBackgroundColor: 'rgba(79, 70, 229, 0.2)',
            }]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                callbacks: {
                  title: (context) => format(currentWeek[context[0].dataIndex], 'MMMM d, yyyy')
                }
              },
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: { 
                  display: true, 
                  text: 'Hours',
                  color: '#6b7280'
                },
                grid: { color: '#f3f4f6' }
              },
              x: {
                grid: { display: false },
                ticks: { color: '#6b7280' }
              }
            }
          }}
          height={200}
        />
      </div>

      {/* Time Entry Form */}
      <form onSubmit={handleTimeSubmit} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="relative">
            <input
              type="date"
              value={newTimeEntry.date || format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setNewTimeEntry({ ...newTimeEntry, date: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>

          <div className="relative">
            <select
              value={newTimeEntry.projectId}
              onChange={(e) => setNewTimeEntry({ ...newTimeEntry, projectId: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Project</option>
              {projects?.map(project => (
                <option key={project.project_id} value={project.project_id}>
                  {project.name}
                </option>
              ))}
            </select>
            <BriefcaseIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>

          <div className="relative">
            <input
              type="number"
              value={newTimeEntry.hours}
              onChange={(e) => setNewTimeEntry({ ...newTimeEntry, hours: e.target.value })}
              placeholder="Hours"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              min="0"
              step="0.25"
              required
            />
          </div>

          <div className="relative">
            <input
              type="text"
              value={newTimeEntry.description}
              onChange={(e) => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })}
              placeholder="Description"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
            <ListBulletIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 text-green-600 text-sm bg-green-50 px-4 py-2 rounded-lg">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            'Log Time'
          )}
        </button>
      </form>

      {/* Recent Entries */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">Recent Entries</h3>
        <div className="space-y-3">
          {timeEntries.slice(0, 5).map(entry => (
            <div key={entry.time_entry_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">{entry.hours}h</span>
                <span className="text-gray-500 ml-2">on {format(new Date(entry.created_at), 'MMM dd')}</span>
              </div>
              <div className="text-gray-600 truncate max-w-[200px]">
                {entry.description}
              </div>
              {entry.project_id && (
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-md">
                  Project #{entry.project_id}
                </span>
              )}
            </div>
          ))}
          {timeEntries.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No time entries logged yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};