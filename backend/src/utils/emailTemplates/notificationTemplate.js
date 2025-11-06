import { baseTemplate } from './baseTemplate.js';

export function notificationTemplate(data = {}) {
  const {
    title = 'Notification',
    message = '',
    type = 'info',
    priority = 'normal',
    details = '',
    actionUrl = '',
    actionText = 'View Details',
    timestamp = new Date().toISOString(),
    category = 'General'
  } = data;

  // Define colors based on notification type
  const typeColors = {
    info: '#2196f3',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    update: '#9c27b0',
    reminder: '#ff5722'
  };

  // Define icons based on notification type
  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    update: '🔄',
    reminder: '⏰'
  };

  // Define styles based on priority
  const priorityStyles = {
    high: {
      background: `${typeColors[type]}10`,
      border: `2px solid ${typeColors[type]}`,
      fontWeight: 'bold'
    },
    normal: {
      background: '#f5f5f5',
      border: '1px solid #e0e0e0'
    },
    low: {
      background: '#ffffff',
      border: '1px solid #e0e0e0',
      opacity: '0.8'
    }
  };

  const primaryColor = typeColors[type] || typeColors.info;
  const icon = typeIcons[type] || typeIcons.info;
  const style = priorityStyles[priority] || priorityStyles.normal;

  // Construct the content
  const content = `
    <div style="
      padding: 20px;
      background-color: ${style.background};
      border: ${style.border};
      border-radius: 4px;
      margin-bottom: 20px;
    ">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <span style="font-size: 24px; margin-right: 10px;">${icon}</span>
        <h2 style="margin: 0; color: ${primaryColor}; font-weight: ${style.fontWeight};">${title}</h2>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; font-size: 16px;">${message}</p>
        ${details ? `<p style="margin: 0; color: #666;">${details}</p>` : ''}
      </div>

      ${category ? `
        <div style="
          display: inline-block;
          padding: 4px 8px;
          background-color: ${primaryColor}20;
          color: ${primaryColor};
          border-radius: 4px;
          font-size: 12px;
          margin-bottom: 15px;
        ">
          ${category}
        </div>
      ` : ''}

      ${timestamp ? `
        <div style="
          color: #666;
          font-size: 12px;
          margin-bottom: 15px;
        ">
          ${timestamp}
        </div>
      ` : ''}

      ${actionUrl ? `
        <div style="text-align: center; margin-top: 20px;">
          <a href="${actionUrl}" 
             style="
               display: inline-block;
               padding: 12px 24px;
               background-color: ${primaryColor};
               color: white;
               text-decoration: none;
               border-radius: 4px;
               font-weight: bold;
             ">
            ${actionText}
          </a>
        </div>
      ` : ''}
    </div>
  `;

  return baseTemplate({
    title,
    content,
    primaryColor,
    footerText: 'This is an automated notification. Please do not reply to this email.'
  });
} 