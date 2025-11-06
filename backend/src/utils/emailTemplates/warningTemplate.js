import { baseTemplate } from './baseTemplate.js';

export const warningTemplate = (data) => {
  const {
    warningType = 'general',
    title,
    message,
    details,
    actionUrl,
    actionText = 'Take Action',
    severity = 'medium',
    deadline
  } = data;

  const warningIcons = {
    deadline: '⏰',
    security: '🔒',
    performance: '📊',
    compliance: '📋',
    general: '⚠️'
  };

  const severityColors = {
    low: '#ffd600',
    medium: '#ff9800',
    high: '#f44336'
  };

  const content = `
    <div style="
      padding: 20px;
      border: 2px solid ${severityColors[severity]};
      border-radius: 8px;
      background-color: ${severityColors[severity]}10;
      margin-bottom: 30px;
    ">
      <div style="
        display: flex;
        align-items: center;
        margin-bottom: 15px;
      ">
        <span style="font-size: 24px; margin-right: 10px;">
          ${warningIcons[warningType]}
        </span>
        <h2 style="margin: 0; color: ${severityColors[severity]};">
          ${title}
        </h2>
      </div>

      <div style="
        font-size: 16px;
        line-height: 1.6;
        margin-bottom: 20px;
      ">
        ${message}
      </div>

      ${details ? `
        <div style="
          background-color: #ffffff;
          padding: 15px;
          border-radius: 4px;
          margin-top: 15px;
          border-left: 4px solid ${severityColors[severity]};
        ">
          <h3 style="color: ${severityColors[severity]}; margin-top: 0;">
            Additional Information:
          </h3>
          ${details}
        </div>
      ` : ''}

      ${deadline ? `
        <div style="
          margin-top: 20px;
          padding: 10px;
          background-color: #fff3e0;
          border-radius: 4px;
          text-align: center;
        ">
          <strong>Deadline:</strong> ${deadline}
        </div>
      ` : ''}
    </div>

    ${actionUrl ? `
      <div style="text-align: center;">
        <a href="${actionUrl}" class="button" style="
          background-color: ${severityColors[severity]};
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        ">
          ${actionText}
        </a>
      </div>
    ` : ''}
  `;

  return baseTemplate({
    ...data,
    title: `Warning: ${title}`,
    content,
    primaryColor: severityColors[severity],
    footerText: 'Please take necessary action to address this warning.'
  });
}; 