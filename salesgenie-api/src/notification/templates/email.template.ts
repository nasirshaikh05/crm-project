export function getEmailHtmlTemplate(subject: string, body: string, workspaceName: string = 'Airnet Data Pty Ltd'): string {
  const htmlContent = body.replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f5f7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f5f7;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
      border: 1px solid #e1e4e8;
    }
    .header {
      background-color: #1e293b;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
      font-size: 15px;
      line-height: 1.6;
      color: #374151;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${workspaceName}</h1>
      </div>
      <div class="content">
        ${htmlContent}
      </div>
      <div class="footer">
        <p>This is an automated notification from ${workspaceName}. Please do not reply directly.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
