export function baseTemplate({ title, content, primaryColor = '#2196f3', footerText }) {
  return {
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        ">
          <div style="
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          ">
            <div style="
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              overflow: hidden;
            ">
              <div style="
                background-color: ${primaryColor};
                padding: 20px;
                text-align: center;
              ">
                <h1 style="
                  margin: 0;
                  color: #ffffff;
                  font-size: 24px;
                ">
                  ${title}
                </h1>
              </div>

              <div style="padding: 20px;">
                ${content}
              </div>

              <div style="
                background-color: #f5f5f5;
                padding: 20px;
                text-align: center;
                border-top: 1px solid #e0e0e0;
              ">
                <p style="
                  margin: 0;
                  color: #666;
                  font-size: 12px;
                ">
                  ${footerText}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      ${title}

      ${content.replace(/<[^>]*>/g, '')}

      ${footerText}
    `
  };
} 