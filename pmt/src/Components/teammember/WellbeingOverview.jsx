import {
    HeartIcon,
    ClockIcon,
    SunIcon,
    Battery100Icon,
    UserCircleIcon,
  } from "@heroicons/react/24/outline";
  import { FireIcon } from "@heroicons/react/24/solid";
  
  export const WellbeingOverview = ({ wellbeingStats }) => {
    const workloadPercentage = (wellbeingStats.weeklyHours / 40) * 100;
    const taskLoadColor = wellbeingStats.taskLoad > 8 ? 'red' : 'green';
  
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <HeartIcon className="w-8 h-8 text-pink-500" />
          Work Wellness
        </h2>
  
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <ClockIcon className="w-6 h-6 text-blue-500" />
              <h3 className="font-semibold">Weekly Hours</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-800">
                {wellbeingStats.weeklyHours}
              </span>
              <span className="text-sm text-gray-500 mb-1">/ 40 hrs</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full" 
                style={{ width: `${workloadPercentage}%` }}
              />
            </div>
          </div>
  
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <FireIcon className="w-6 h-6 text-orange-500" />
              <h3 className="font-semibold">Task Load</h3>
            </div>
            <span className={`text-3xl font-bold text-${taskLoadColor}-500`}>
              {wellbeingStats.taskLoad}
            </span>
            <span className="text-sm text-gray-500 ml-2">active tasks</span>
          </div>
        </div>
  
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <SunIcon className="w-5 h-5 text-yellow-500" />
            Daily Recommendations
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Battery100Icon className="w-6 h-6 text-green-500" />
              <p className="text-sm">
                {wellbeingStats.weeklyHours > 35 ? 
                  "Consider taking a 15min break every 90mins" : 
                  "Good work-life balance maintained!"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <UserCircleIcon className="w-6 h-6 text-blue-500" />
              <p className="text-sm">
                {wellbeingStats.meetingTime > 4 ? 
                  "Try to schedule focus time between meetings" : 
                  "Optimal meeting distribution"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };