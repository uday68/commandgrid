import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const ProjectProgressChart = ({ projects }) => {
  const { t } = useTranslation(['projects', 'common']);
  const [activeChart, setActiveChart] = useState('doughnut');
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  
  useEffect(() => {
    if (!projects || projects.length === 0) return;
    
    // Process projects for chart data
    const projectNames = projects.map(p => p.name);
    const progressValues = projects.map(p => p.progress || 0);
    const remainingValues = projects.map(p => 100 - (p.progress || 0));
    
    // Status counts for the status chart
    const statusCounts = {};
    projects.forEach(project => {
      const status = project.status || 'Not Set';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const statusLabels = Object.keys(statusCounts);
    const statusData = Object.values(statusCounts);
    
    // Colors for the charts
    const backgroundColors = [
      'rgba(54, 162, 235, 0.8)', // Blue
      'rgba(255, 99, 132, 0.8)', // Pink
      'rgba(255, 206, 86, 0.8)', // Yellow
      'rgba(75, 192, 192, 0.8)',  // Teal
      'rgba(153, 102, 255, 0.8)', // Purple
      'rgba(255, 159, 64, 0.8)',  // Orange
      'rgba(199, 199, 199, 0.8)', // Gray
    ];
    
    // Set data based on active chart type
    if (activeChart === 'doughnut') {
      setChartData({
        labels: statusLabels,
        datasets: [
          {
            data: statusData,
            backgroundColor: backgroundColors.slice(0, statusLabels.length),
            borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
            borderWidth: 1,
          }
        ]
      });
    } else if (activeChart === 'bar') {
      setChartData({
        labels: projectNames,
        datasets: [
          {
            label: t('projects.progress'),
            data: progressValues,
            backgroundColor: 'rgba(75, 192, 192, 0.8)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: t('projects.remaining'),
            data: remainingValues,
            backgroundColor: 'rgba(255, 99, 132, 0.8)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          }
        ]
      });
    }
  }, [projects, activeChart, t]);

  // Chart options
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        padding: 10,
        cornerRadius: 4,
        displayColors: true
      }
    },
    ...(activeChart === 'bar' && {
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) { return value + '%'; }
          }
        }
      }
    })
  };

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="text-slate-400 dark:text-slate-500 mb-3">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-center">{t('charts.noData')}</p>
      </div>
    );
  }

  // Chart toggle buttons
  const chartToggle = (
    <div className="flex justify-end mb-4">
      <div className="inline-flex rounded-md shadow-sm">
        <button
          type="button"
          className={`py-1.5 px-3 text-xs font-medium rounded-l-md ${
            activeChart === 'doughnut'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600'
          } border border-gray-200 dark:border-slate-600 focus:outline-none`}
          onClick={() => setActiveChart('doughnut')}
        >
          {t('charts.status')}
        </button>
        <button
          type="button"
          className={`py-1.5 px-3 text-xs font-medium rounded-r-md ${
            activeChart === 'bar'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600'
          } border border-gray-200 dark:border-slate-600 focus:outline-none`}
          onClick={() => setActiveChart('bar')}
        >
          {t('charts.progress')}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {chartToggle}
      <div className="max-h-[300px] flex justify-center">
        {activeChart === 'doughnut' ? (
          <div className="max-w-[300px]">
            <Doughnut data={chartData} options={options} />
          </div>
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};

export default ProjectProgressChart;