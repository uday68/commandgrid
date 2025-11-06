import { CalendarIcon } from "@heroicons/react/24/outline";

export const TaskCard = ({ task }) => (
  <div className="group bg-white hover:shadow-lg rounded-xl p-4 transition-all">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">{task.title}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
      </div>
      <span className={s`px-2 py-1 rounded-full text-xs font-medium 
        ${task.priority === 'High' ? 'bg-red-100 text-red-700' :
          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'}`}>
        {task.priority}
      </span>
    </div>
    
    <div className="mt-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500">
          Due {new Date(task.due_date).toLocaleDateString()}
        </span>
      </div>
      <button className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-lg">
        Mark Complete
      </button>
    </div>
  </div>
);