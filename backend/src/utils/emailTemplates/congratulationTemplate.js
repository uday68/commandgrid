import { baseTemplate } from './baseTemplate.js';

export const congratulationTemplate = (data) => {
  const {
    recipientName,
    achievement,
    message,
    details,
    actionUrl,
    actionText = 'View Achievement',
    achievementType = 'milestone'
  } = data;

  const achievementIcons = {
    milestone: '🎯',
    completion: '🏆',
    award: '🏅',
    recognition: '🌟',
    promotion: '📈'
  };

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 48px; margin-bottom: 20px;">
        ${achievementIcons[achievementType]}
      </div>
      <h1 style="color: #2e7d32; margin-bottom: 15px;">
        Congratulations, ${recipientName}!
      </h1>
      <div style="font-size: 20px; color: #1b5e20; margin-bottom: 20px;">
        ${achievement}
      </div>
    </div>

    <div style="
      background-color: #f1f8e9;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    ">
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        ${message}
      </p>
      ${details ? `
        <div style="
          background-color: #ffffff;
          padding: 15px;
          border-radius: 4px;
          margin-top: 15px;
        ">
          <h3 style="color: #2e7d32; margin-top: 0;">Achievement Details:</h3>
          ${details}
        </div>
      ` : ''}
    </div>

    ${actionUrl ? `
      <div style="text-align: center; margin-top: 30px;">
        <a href="${actionUrl}" class="button" style="
          background-color: #2e7d32;
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
    title: `Congratulations: ${achievement}`,
    content,
    primaryColor: '#2e7d32',
    footerText: `Keep up the great work, ${recipientName}!`
  });
}; 