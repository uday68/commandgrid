export const QuickActions = ({ onRequestBreak, onFileReport }) => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={onRequestBreak}
          className="p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
        >
          <span className="block text-sm font-medium">Request Break</span>
          <span className="text-xs text-gray-500">15 min recharge</span>
        </button>
        <button 
          onClick={onFileReport}
          className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
        >
          <span className="block text-sm font-medium">File Report</span>
          <span className="text-xs text-gray-500">Submit documents</span>
        </button>
      </div>
    </div>
  );