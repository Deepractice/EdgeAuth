/**
 * Template Renderer
 *
 * Provides utilities for rendering HTML templates with data
 * Isolated from API logic to maintain separation of concerns
 */

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Template function type
 */
export type TemplateFunction<T = Record<string, any>> = (data: T) => string;

/**
 * Render a template with data
 */
export function render<T = Record<string, any>>(
  template: TemplateFunction<T>,
  data: T,
): string {
  return template(data);
}
