import { baseTemplate } from './baseTemplate.js';

export function systemAlertTemplate(data) {
  const {
    title,
    alertType = 'system',
    severity = 'high',
    message,
    details,
    affectedSystems = [],
    actionUrl,
    actionText = 'View Details'
  } = data;

  // Define colors based on severity
  const severityColors = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#20c997'
  };

  // Define icons based on alert type
  const alertIcons = {
    system: '⚠️',
    security: '🔒',
    performance: '⚡',
    maintenance: '🔧',
    update: '🔄',
    error: '❌'
  };

  const primaryColor = severityColors[severity] || severityColors.high;
  const icon = alertIcons[alertType] || alertIcons.system;

  // Construct the content
  const content = `
    <div style="padding: 20px; background-color: ${primaryColor}10; border-left: 4px solid ${primaryColor}; border-radius: 4px;">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <span style="font-size: 24px; margin-right: 10px;">${icon}</span>
        <h2 style="margin: 0; color: ${primaryColor};">${title}</h2>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; font-size: 16px;">${message}</p>
        ${details ? `<p style="margin: 0; color: #666;">${details}</p>` : ''}
      </div>

      ${affectedSystems.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px;">Affected Systems:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${affectedSystems.map(system => `
              <li style="margin-bottom: 5px;">${system}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${actionUrl ? `
        <div style="text-align: center; margin-top: 20px;">
          <a href="${actionUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: ${primaryColor}; 
                    color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
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
    footerText: 'This is an automated system alert. Please do not reply to this email.'
  });
} 