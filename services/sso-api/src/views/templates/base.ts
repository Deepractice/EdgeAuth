/**
 * Base HTML Template
 *
 * Provides the common HTML structure for all pages
 */

export interface BaseTemplateData {
  title: string;
  content: string;
  styles?: string;
  scripts?: string;
}

export function baseTemplate(data: BaseTemplateData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} - EdgeAuth</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      padding: 40px;
      width: 100%;
      max-width: 400px;
    }

    .logo {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo h1 {
      color: #667eea;
      font-size: 28px;
      font-weight: 600;
    }

    .logo p {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }

    ${data.styles || ''}
  </style>
  ${data.scripts || ''}
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>EdgeAuth</h1>
      <p>Secure Single Sign-On</p>
    </div>
    ${data.content}
  </div>
</body>
</html>`;
}
