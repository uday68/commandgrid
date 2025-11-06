import { baseTemplate } from './baseTemplate.js';

export function reportTemplate(data) {
  const {
    title,
    reportType,
    period,
    summary,
    metrics = [],
    charts = [],
    tables = [],
    attachments = [],
    actionUrl,
    actionText = 'View Full Report',
    generatedBy,
    generatedAt
  } = data;

  // Define colors based on report type
  const reportColors = {
    performance: '#2196f3',
    financial: '#4caf50',
    status: '#ff9800',
    analytics: '#9c27b0',
    summary: '#607d8b',
    custom: '#795548'
  };

  // Define icons based on report type
  const reportIcons = {
    performance: '📊',
    financial: '💰',
    status: '📈',
    analytics: '📉',
    summary: '📋',
    custom: '📑'
  };

  const primaryColor = reportColors[reportType] || reportColors.summary;
  const icon = reportIcons[reportType] || reportIcons.summary;

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
          color: ${primaryColor};
        ">
          ${icon}
        </span>
        <div>
          <h2 style="
            margin: 0 0 5px 0;
            color: ${primaryColor};
          ">
            ${title}
          </h2>
          <div style="
            color: #666;
            font-size: 14px;
          ">
            ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
            ${period ? ` for ${period}` : ''}
          </div>
        </div>
      </div>

      <div style="
        background-color: #f5f5f5;
        padding: 20px;
        border-radius: 4px;
        margin-bottom: 20px;
      ">
        ${summary ? `
          <div style="
            margin-bottom: 20px;
            color: #333;
            line-height: 1.6;
          ">
            ${summary}
          </div>
        ` : ''}

        ${metrics.length > 0 ? `
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          ">
            ${metrics.map(metric => `
              <div style="
                background-color: white;
                padding: 15px;
                border-radius: 4px;
                text-align: center;
              ">
                <div style="
                  font-size: 24px;
                  font-weight: bold;
                  color: ${primaryColor};
                  margin-bottom: 5px;
                ">
                  ${metric.value}
                </div>
                <div style="
                  color: #666;
                  font-size: 14px;
                ">
                  ${metric.label}
                </div>
                ${metric.change ? `
                  <div style="
                    color: ${metric.change > 0 ? '#4caf50' : '#f44336'};
                    font-size: 12px;
                    margin-top: 5px;
                  ">
                    ${metric.change > 0 ? '↑' : '↓'} ${Math.abs(metric.change)}%
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${charts.length > 0 ? `
          <div style="margin-bottom: 20px;">
            ${charts.map(chart => `
              <div style="
                background-color: white;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 15px;
              ">
                ${chart.title ? `
                  <h4 style="
                    margin: 0 0 10px 0;
                    color: #333;
                    font-size: 16px;
                  ">
                    ${chart.title}
                  </h4>
                ` : ''}
                <img src="${chart.imageUrl}" 
                     alt="${chart.title || 'Chart'}" 
                     style="
                       width: 100%;
                       height: auto;
                       border-radius: 4px;
                     "
                />
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${tables.length > 0 ? `
          <div style="margin-bottom: 20px;">
            ${tables.map(table => `
              <div style="
                background-color: white;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 15px;
                overflow-x: auto;
              ">
                ${table.title ? `
                  <h4 style="
                    margin: 0 0 10px 0;
                    color: #333;
                    font-size: 16px;
                  ">
                    ${table.title}
                  </h4>
                ` : ''}
                <table style="
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 14px;
                ">
                  <thead>
                    <tr>
                      ${table.headers.map(header => `
                        <th style="
                          padding: 10px;
                          text-align: left;
                          background-color: ${primaryColor}10;
                          color: ${primaryColor};
                          border-bottom: 2px solid ${primaryColor};
                        ">
                          ${header}
                        </th>
                      `).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${table.rows.map(row => `
                      <tr>
                        ${row.map(cell => `
                          <td style="
                            padding: 10px;
                            border-bottom: 1px solid #e0e0e0;
                            color: #333;
                          ">
                            ${cell}
                          </td>
                        `).join('')}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `).join('')}
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

      ${generatedBy || generatedAt ? `
        <div style="
          text-align: right;
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        ">
          ${generatedBy ? `Generated by ${generatedBy}` : ''}
          ${generatedBy && generatedAt ? ' on ' : ''}
          ${generatedAt ? generatedAt : ''}
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
    title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report: ${title}`,
    content,
    primaryColor,
    footerText: 'This is an automated report. Please do not reply to this email.'
  });
} 