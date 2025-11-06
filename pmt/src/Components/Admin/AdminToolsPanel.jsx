import { FiTool, FiDatabase, FiDownload, FiUpload, FiShield } from 'react-icons/fi';

const AdminToolsPanel = () => {
  const tools = [
    { icon: FiDatabase, label: 'Database Backup', action: 'backup' },
    { icon: FiDownload, label: 'Export Data', action: 'export' },
    { icon: FiUpload, label: 'Bulk Import', action: 'import' },
    { icon: FiShield, label: 'Security Scan', action: 'security' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <FiTool className="mr-2" /> Administration Toolkit
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map((tool, index) => (
          <button 
            key={index}
            className="p-6 border rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => console.log('Action:', tool.action)}
          >
            <tool.icon className="text-3xl mb-4 text-gray-600" />
            <h3 className="text-lg font-semibold">{tool.label}</h3>
          </button>
        ))}
      </div>
    </div>
  );
};
export default AdminToolsPanel