/**
 * SSO Login Page Template
 *
 * Renders the login form for SSO authentication
 */

import { escapeHtml } from "../renderer.js";
import { baseTemplate } from "./base.js";

export interface LoginTemplateData {
  redirectUri: string;
  error?: string;
  email?: string;
}

export function loginTemplate(data: LoginTemplateData): string {
  const formContent = `
    <div class="login-form">
      ${
        data.error
          ? `<div class="error-message">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" fill="currentColor"/>
          </svg>
          ${escapeHtml(data.error)}
        </div>`
          : ""
      }

      <form method="POST" action="/sso/login">
        <input type="hidden" name="redirectUri" value="${escapeHtml(data.redirectUri)}" />

        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autofocus
            value="${escapeHtml(data.email || "")}"
            placeholder="you@example.com"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="Enter your password"
          />
        </div>

        <button type="submit" class="btn-primary">
          Sign In
        </button>
      </form>

      <div class="footer-text">
        <p>Don't have an account? <a href="/sso/register${data.redirectUri ? `?redirect_uri=${encodeURIComponent(data.redirectUri)}` : ""}">Create one</a></p>
        <p class="terms">By signing in, you agree to our Terms of Service</p>
      </div>
    </div>
  `;

  const styles = `
    .login-form {
      width: 100%;
    }

    .error-message {
      background: #fee;
      color: #c33;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      color: #333;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .form-group input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .btn-primary {
      width: 100%;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .footer-text {
      margin-top: 24px;
      text-align: center;
    }

    .footer-text p {
      color: #999;
      font-size: 12px;
      margin: 8px 0;
    }

    .footer-text a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .footer-text a:hover {
      text-decoration: underline;
    }

    .footer-text .terms {
      margin-top: 16px;
    }
  `;

  return baseTemplate({
    title: "Sign In",
    content: formContent,
    styles,
  });
}
