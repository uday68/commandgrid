import { baseTemplate } from './baseTemplate.js';

export function deadlineReminderTemplate(data) {
  const {
    title,
    dueDate,
    timeRemaining,
    priority = 'medium',
    description,
    projectName,
    category,
    assignee,
    attachments = [],
    actionUrl,
    actionText = 'View Details',
    reminderType = 'upcoming'
  } = data;

  // Define colors based on priority
  const priorityColors = {
    high: '#f44336',
    medium: '#ff9800',
    low: '#4caf50'
  };

  // Define icons based on priority
  const priorityIcons = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
  };

  // Define reminder type styles
  const reminderStyles = {
    upcoming: {
      icon: '⏰',
      color: '#ff9800'
    },
    overdue: {
      icon: '⚠️',
      color: '#f44336'
    },
    today: {
      icon: '📅',
      color: '#2196f3'
    }
  };

  const primaryColor = priorityColors[priority] || priorityColors.medium;
  const priorityIcon = priorityIcons[priority] || priorityIcons.medium;
  const reminderStyle = reminderStyles[reminderType] || reminderStyles.upcoming;

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
        <span style="
          font-size: 32px;
          margin-right: 15px;
          color: ${reminderStyle.color};
        ">
          ${reminderStyle.icon}
        </span>
        <div>
          <h2 style="
            margin: 0 0 5px 0;
            color: ${reminderStyle.color};
          ">
            ${title}
          </h2>
          <div style="
            color: #666;
            font-size: 14px;
          ">
            ${reminderType === 'overdue' ? 'Overdue' : 'Due'} on ${dueDate}
          </div>
        </div>
      </div>

      <div style="
        background-color: #f5f5f5;
        padding: 20px;
        border-radius: 4px;
        margin-bottom: 20px;
      ">
        <div style="
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 15px;
        ">
          <div style="
            display: flex;
            align-items: center;
            padding: 4px 8px;
            background-color: ${primaryColor}20;
            color: ${primaryColor};
            border-radius: 4px;
            font-size: 12px;
          ">
            ${priorityIcon} ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
          </div>

          ${projectName ? `
            <div style="
              padding: 4px 8px;
              background-color: #e3f2fd;
              color: #1976d2;
              border-radius: 4px;
              font-size: 12px;
            ">
              📁 ${projectName}
            </div>
          ` : ''}

          ${category ? `
            <div style="
              padding: 4px 8px;
              background-color: #f3e5f5;
              color: #7b1fa2;
              border-radius: 4px;
              font-size: 12px;
            ">
              🏷️ ${category}
            </div>
          ` : ''}
        </div>

        ${description ? `
          <div style="
            margin-bottom: 15px;
            color: #333;
            line-height: 1.6;
          ">
            ${description}
          </div>
        ` : ''}

        ${timeRemaining ? `
          <div style="
            margin-bottom: 15px;
            padding: 10px;
            background-color: ${reminderStyle.color}10;
            border-radius: 4px;
            color: ${reminderStyle.color};
            font-weight: bold;
          ">
            ${timeRemaining}
          </div>
        ` : ''}

        ${assignee ? `
          <div style="
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          ">
            ${assignee.avatar ? `
              <img src="${assignee.avatar}" 
                   alt="${assignee.name}" 
                   style="
                     width: 30px;
                     height: 30px;
                     border-radius: 50%;
                     margin-right: 10px;
                   "
              />
            ` : ''}
            <div>
              <div style="font-weight: bold;">${assignee.name}</div>
              ${assignee.role ? `
                <div style="color: #666; font-size: 12px;">
                  ${assignee.role}
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${attachments.length > 0 ? `
          <div>
            <h4 style="
              margin: 0 0 10px 0;
              color: #666;
              font-size: 14px;
            ">
              Attachments:
            </h4>
            <ul style="
              margin: 0;
              padding-left: 20px;
              color: #666;
            ">
              ${attachments.map(attachment => `
                <li style="margin-bottom: 5px;">
                  📎 ${attachment.name}
                  ${attachment.size ? ` (${attachment.size})` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>

      ${actionUrl ? `
        <div style="text-align: center;">
          <a href="${actionUrl}" 
             style="
               display: inline-block;
               padding: 12px 24px;
               background-color: ${reminderStyle.color};
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
    title: `Deadline Reminder: ${title}`,
    content,
    primaryColor: reminderStyle.color,
    footerText: 'This is an automated deadline reminder. Please do not reply to this email.'
  });
} 