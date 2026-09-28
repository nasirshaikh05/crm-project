/**
 * Generates the redirect HTML response page displayed to a lead
 * after clicking an action button in an email.
 */
export function getRedirectHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Response Recorded</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
      background-color: #f3f4f6; 
      color: #1f2937; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      margin: 0; 
    }
    .card { 
      background: white; 
      padding: 2.5rem; 
      border-radius: 12px; 
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); 
      text-align: center; 
      max-width: 400px; 
      width: 90%; 
    }
    .icon { 
      font-size: 3rem; 
      color: #10b981; 
      margin-bottom: 1rem; 
    }
    h1 { 
      font-size: 1.5rem; 
      margin-bottom: 0.5rem; 
      color: #111827; 
    }
    p { 
      color: #6b7280; 
      font-size: 0.95rem; 
      line-height: 1.5; 
    }
    .footer { 
      margin-top: 2rem; 
      font-size: 0.8rem; 
      color: #9ca3af; 
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Response Recorded</h1>
    <p>Thank you! Your action has been successfully processed and recorded in our CRM system.</p>
    <div class="footer">SalesGenie CRM Automation</div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates the HTML page displayed to a lead when they click an email action button
 * but the response has already been recorded.
 */
export function getAlreadyRecordedHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Response Already Recorded</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
      background-color: #f3f4f6; 
      color: #1f2937; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      margin: 0; 
    }
    .card { 
      background: white; 
      padding: 2.5rem; 
      border-radius: 12px; 
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); 
      text-align: center; 
      max-width: 400px; 
      width: 90%; 
    }
    .icon { 
      font-size: 3rem; 
      color: #f59e0b; 
      margin-bottom: 1rem; 
    }
    h1 { 
      font-size: 1.5rem; 
      margin-bottom: 0.5rem; 
      color: #111827; 
    }
    p { 
      color: #6b7280; 
      font-size: 0.95rem; 
      line-height: 1.5; 
    }
    .footer { 
      margin-top: 2rem; 
      font-size: 0.8rem; 
      color: #9ca3af; 
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠</div>
    <h1>Already Recorded</h1>
    <p>This response has been already recorded , contact our team for any Issues</p>
    <div class="footer">SalesGenie CRM Automation</div>
  </div>
</body>
</html>
  `.trim();
}
