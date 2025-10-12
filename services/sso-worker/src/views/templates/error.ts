/**
 * Error Page Template
 *
 * Renders error pages with user-friendly messages
 */

import { escapeHtml } from '../renderer.js';
import { baseTemplate } from './base.js';

export interface ErrorTemplateData {
  error: string;
  message?: string;
  backUrl?: string;
}

export function errorTemplate(data: ErrorTemplateData): string {
  const errorContent = `
    <div class="error-page">
      <div class="error-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="4"/>
          <path d="M32 16v20M32 44v4" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        </svg>
      </div>

      <h2>${escapeHtml(data.error)}</h2>

      ${
        data.message
          ? `<p class="error-description">${escapeHtml(data.message)}</p>`
          : ''
      }

      ${
        data.backUrl
          ? `<a href="${escapeHtml(data.backUrl)}" class="btn-secondary">Go Back</a>`
          : ''
      }
    </div>
  `;

  const styles = `
    .error-page {
      text-align: center;
      padding: 20px 0;
    }

    .error-icon {
      color: #c33;
      margin-bottom: 24px;
    }

    .error-page h2 {
      color: #333;
      font-size: 24px;
      margin-bottom: 12px;
    }

    .error-description {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    .btn-secondary {
      display: inline-block;
      padding: 12px 24px;
      background: #f5f5f5;
      color: #333;
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }

    .btn-secondary:hover {
      background: #e5e5e5;
    }
  `;

  return baseTemplate({
    title: 'Error',
    content: errorContent,
    styles,
  });
}
