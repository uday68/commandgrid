import { baseTemplate } from './baseTemplate.js';

export function invitationTemplate(data) {
  const {
    title,
    inviterName,
    inviterRole,
    inviterAvatar,
    message,
    invitationType = 'project',
    details,
    actionUrl,
    actionText = 'Accept Invitation',
    expiryDate,
    companyName
  } = data;

  // Define icons and colors based on invitation type
  const invitationTypes = {
    project: {
      icon: '📋',
      color: '#2196f3'
    },
    team: {
      icon: '👥',
      color: '#4caf50'
    },
    meeting: {
      icon: '📅',
      color: '#ff9800'
    },
    event: {
      icon: '🎉',
      color: '#9c27b0'
    },
    workspace: {
      icon: '💼',
      color: '#795548'
    },
    company: {
      icon: '🏢',
      color: '#607d8b'
    }
  };

  const type = invitationTypes[invitationType] || invitationTypes.project;
  const primaryColor = type.color;

  // Construct the content
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <span style="font-size: 48px; display: block; margin-bottom: 20px;">${type.icon}</span>
      <h1 style="margin: 0; color: ${primaryColor};">${title}</h1>
    </div>

    <div style="
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    ">
      <div style="
        display: flex;
        align-items: center;
        margin-bottom: 20px;
      ">
        ${inviterAvatar ? `
          <img src="${inviterAvatar}" 
               alt="${inviterName}" 
               style="
                 width: 60px;
                 height: 60px;
                 border-radius: 50%;
                 margin-right: 15px;
               "
          />
        ` : ''}
        <div>
          <h3 style="margin: 0 0 5px 0;">${inviterName}</h3>
          <p style="margin: 0; color: #666;">${inviterRole}</p>
        </div>
      </div>

      <div style="
        background-color: white;
        padding: 20px;
        border-radius: 4px;
        margin-bottom: 20px;
      ">
        <p style="margin: 0 0 15px 0; font-size: 16px;">${message}</p>
        ${details ? `
          <div style="
            background-color: ${primaryColor}10;
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
          ">
            ${details}
          </div>
        ` : ''}
      </div>

      ${expiryDate ? `
        <div style="
          text-align: center;
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        ">
          This invitation expires on ${expiryDate}
        </div>
      ` : ''}

      ${actionUrl ? `
        <div style="text-align: center;">
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

    ${companyName ? `
      <div style="
        text-align: center;
        color: #666;
        font-size: 14px;
        margin-top: 30px;
      ">
        ${companyName}
      </div>
    ` : ''}
  `;

  return baseTemplate({
    title,
    content,
    primaryColor,
    footerText: 'This invitation was sent automatically. Please do not reply to this email.'
  });
} 