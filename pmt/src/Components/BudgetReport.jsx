// frontend/components/BudgetReport.jsx
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { saveAs } from 'file-saver';
import { useAuth } from '../context/AuthContext';
import { generateBudgetPDF } from '../utils/pdfGenerator';
import { API } from '../services/api';
import { Button, Spin, Alert, Table } from 'antd';
import { DownloadOutlined, RobotOutlined } from '@ant-design/icons';

const BudgetReport = ({ projectId }) => {
  const [state, setState] = useState({
    loading: true,
    data: [],
    analysis: null,
    error: null
  });
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await API.get(`/projects/${projectId}/budget`);
        setState(prev => ({ ...prev, data, loading: false }));
      } catch (error) {
        setState(prev => ({ ...prev, error: error.message, loading: false }));
      }
    };
    fetchData();
  }, [projectId]);

  const handleAIAnalysis = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const { data } = await API.post('/ai/analyze', {
        projectId,
        userId: user.id
      });
      setState(prev => ({ ...prev, analysis: data, loading: false }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(state.data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget');
    XLSX.writeFile(workbook, `budget-${projectId}.xlsx`);
  };

  const columns = [
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Planned (USD)', dataIndex: 'planned', key: 'planned' },
    { title: 'Actual (USD)', dataIndex: 'actual', key: 'actual' },
    { 
      title: 'Variance', 
      key: 'variance',
      render: (_, record) => (
        <span className={`variance ${record.variance < 0 ? 'negative' : 'positive'}`}>
          {record.variance}%
        </span>
      )
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Project Budget Report</h1>
        <div className="flex gap-4">
          <Button 
            type="primary" 
            icon={<RobotOutlined />}
            onClick={handleAIAnalysis}
            loading={state.loading}
          >
            Generate AI Analysis
          </Button>
          <Button onClick={exportExcel} icon={<DownloadOutlined />}>
            Export Excel
          </Button>
          <Button onClick={() => generateBudgetPDF(state.data)} icon={<DownloadOutlined />}>
            Export PDF
          </Button>
        </div>
      </div>

      {state.error && <Alert message={state.error} type="error" showIcon className="mb-6" />}

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <Bar
          data={{
            labels: state.data.map(d => d.category),
            datasets: [{
              label: 'Planned Budget',
              data: state.data.map(d => d.planned),
              backgroundColor: '#3B82F6'
            }, {
              label: 'Actual Spending',
              data: state.data.map(d => d.actual),
              backgroundColor: '#10B981'
            }]
          }}
          options={{ responsive: true }}
        />
      </div>

      <Table 
        columns={columns} 
        dataSource={state.data}
        rowKey="itemId"
        pagination={false}
        className="shadow-md"
      />

      {state.analysis && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-bold mb-4">AI Analysis Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="font-semibold mb-2">Key Insights</h3>
              <p>{state.analysis.summary}</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="font-semibold mb-2">Recommendations</h3>
              <ul className="list-disc pl-4">
                {state.analysis.recommendations.map((rec, i) => (
                  <li key={i} className="mb-2">{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetReport;