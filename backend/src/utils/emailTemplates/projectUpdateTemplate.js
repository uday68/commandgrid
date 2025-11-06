import { baseTemplate } from './baseTemplate.js';

export function projectUpdateTemplate(data) {
  const {
    projectName,
    updateType,
    message,
    details,
    progress,
    status = 'active',
    milestones = [],
    recentActivities = [],
    teamMembers = [],
    actionUrl,
    actionText = 'View Project',
    updateDate
  } = data;

  // Define colors based on status
  const statusColors = {
    active: '#4caf50',
    onHold: '#ff9800',
    completed: '#2196f3',
    cancelled: '#f44336',
    planning: '#9c27b0'
  };

  // Define icons based on status
  const statusIcons = {
    active: '🟢',
    onHold: '🟡',
    completed: '✅',
    cancelled: '❌',
    planning: '📋'
  };

  const primaryColor = statusColors[status] || statusColors.active;
  const statusIcon = statusIcons[status] || statusIcons.active;

  // Construct the content
  const content = `
    <div style="
      background-color: #ffffff;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    ">
      <div style="
        display: flex;
        align-items: center;
        margin-bottom: 20px;
      ">
        <div style="
          padding: 8px 12px;
          background-color: ${primaryColor}20;
          color: ${primaryColor};
          border-radius: 4px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 5px;
        ">
          ${statusIcon} ${status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>

      <h2 style="
        margin: 0 0 15px 0;
        color: #333;
        font-size: 24px;
      ">
        ${projectName}
      </h2>

      <div style="
        background-color: #f5f5f5;
        padding: 20px;
        border-radius: 4px;
        margin-bottom: 20px;
      ">
        <h3 style="
          margin: 0 0 15px 0;
          color: ${primaryColor};
          font-size: 18px;
        ">
          ${updateType}
        </h3>

        <div style="
          margin-bottom: 20px;
          color: #333;
          line-height: 1.6;
        ">
          ${message}
        </div>

        ${details ? `
          <div style="
            background-color: white;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            color: #666;
          ">
            ${details}
          </div>
        ` : ''}

        ${progress !== undefined ? `
          <div style="margin-bottom: 20px;">
            <div style="
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            ">
              <span style="color: #666;">Progress</span>
              <span style="color: #333; font-weight: bold;">${progress}%</span>
            </div>
            <div style="
              height: 8px;
              background-color: #e0e0e0;
              border-radius: 4px;
              overflow: hidden;
            ">
              <div style="
                width: ${progress}%;
                height: 100%;
                background-color: ${primaryColor};
                border-radius: 4px;
              "></div>
            </div>
          </div>
        ` : ''}

        ${milestones.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="
              margin: 0 0 10px 0;
              color: #333;
              font-size: 16px;
            ">
              Recent Milestones
            </h4>
            <ul style="
              margin: 0;
              padding-left: 20px;
              color: #666;
            ">
              ${milestones.map(milestone => `
                <li style="margin-bottom: 5px;">
                  ${milestone.completed ? '✅' : '⏳'} ${milestone.name}
                  ${milestone.date ? ` (${milestone.date})` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${recentActivities.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="
              margin: 0 0 10px 0;
              color: #333;
              font-size: 16px;
            ">
              Recent Activities
            </h4>
            <ul style="
              margin: 0;
              padding-left: 20px;
              color: #666;
            ">
              ${recentActivities.map(activity => `
                <li style="margin-bottom: 5px;">
                  ${activity.icon || '📝'} ${activity.description}
                  ${activity.date ? ` (${activity.date})` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${teamMembers.length > 0 ? `
          <div>
            <h4 style="
              margin: 0 0 10px 0;
              color: #333;
              font-size: 16px;
            ">
              Team Members
            </h4>
            <div style="
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            ">
              ${teamMembers.map(member => `
                <div style="
                  display: flex;
                  align-items: center;
                  padding: 4px 8px;
                  background-color: #e3f2fd;
                  border-radius: 4px;
                  font-size: 12px;
                ">
                  ${member.avatar ? `
                    <img src="${member.avatar}" 
                         alt="${member.name}" 
                         style="
                           width: 20px;
                           height: 20px;
                           border-radius: 50%;
                           margin-right: 5px;
                         "
                    />
                  ` : ''}
                  ${member.name}
                  ${member.role ? ` (${member.role})` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      ${updateDate ? `
        <div style="
          text-align: right;
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        ">
          Last updated: ${updateDate}
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
  `;

  return baseTemplate({
    title: `${projectName} - ${updateType}`,
    content,
    primaryColor,
    footerText: 'This is an automated project update notification. Please do not reply to this email.'
  });
} 