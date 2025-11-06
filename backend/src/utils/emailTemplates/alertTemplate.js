import { baseTemplate } from './baseTemplate.js';

export const alertTemplate = (data) => {
  const {
    alertType = 'info',
    message,
    details,
    actionUrl,
    actionText = 'View Details',
    severity = 'medium'
  } = data;

  const colors = {
    info: '#2196f3',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336'
  };

  const severityIcons = {
    low: 'ℹ️',
    medium: '⚠️',
    high: '🚨'
  };

  const content = `
    <div style="
      padding: 15px;
      border-left: 4px solid ${colors[alertType]};
      background-color: ${colors[alertType]}10;
      margin-bottom: 20px;
    ">
      <div style="font-size: 18px; margin-bottom: 10px;">
        ${severityIcons[severity]} ${message}
      </div>
      ${details ? `
        <div style="color: #666; font-size: 14px;">
          ${details}
        </div>
      ` : ''}
    </div>
  `;

  return baseTemplate({
    ...data,
    title: `Alert: ${message}`,
    content,
    primaryColor: colors[alertType],
    actionButton: actionUrl ? {
      url: actionUrl,
      text: actionText
    } : null
  });
}; 