import { baseTemplate } from './baseTemplate.js';

export function taskAssignmentTemplate(data) {
  const {
    taskTitle,
    assignerName,
    assignerAvatar,
    dueDate,
    priority = 'medium',
    description,
    projectName,
    category,
    estimatedHours,
    attachments = [],
    actionUrl,
    actionText = 'View Task'
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

  const primaryColor = priorityColors[priority] || priorityColors.medium;
  const priorityIcon = priorityIcons[priority] || priorityIcons.medium;

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
        ${assignerAvatar ? `
          <img src="${assignerAvatar}" 
               alt="${assignerName}" 
               style="
                 width: 50px;
                 height: 50px;
                 border-radius: 50%;
                 margin-right: 15px;
               "
          />
        ` : ''}
        <div>
          <h3 style="margin: 0 0 5px 0;">${assignerName}</h3>
          <p style="margin: 0; color: #666;">has assigned you a new task</p>
        </div>
      </div>

      <div style="
        background-color: #f5f5f5;
        padding: 20px;
        border-radius: 4px;
        margin-bottom: 20px;
      ">
        <h2 style="
          margin: 0 0 15px 0;
          color: ${primaryColor};
          font-size: 20px;
        ">
          ${taskTitle}
        </h2>

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

        <div style="
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 15px;
        ">
          ${dueDate ? `
            <div style="
              display: flex;
              align-items: center;
              color: #666;
              font-size: 14px;
            ">
              <span style="margin-right: 5px;">📅</span>
              Due: ${dueDate}
            </div>
          ` : ''}

          ${estimatedHours ? `
            <div style="
              display: flex;
              align-items: center;
              color: #666;
              font-size: 14px;
            ">
              <span style="margin-right: 5px;">⏱️</span>
              Estimated: ${estimatedHours} hours
            </div>
          ` : ''}
        </div>

        ${attachments.length > 0 ? `
          <div style="margin-top: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #666;">Attachments:</h4>
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
    title: `New Task Assignment: ${taskTitle}`,
    content,
    primaryColor,
    footerText: 'This is an automated task assignment notification. Please do not reply to this email.'
  });
} 