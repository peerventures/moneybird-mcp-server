/**
 * Semantic versioning for the Moneybird MCP Server
 * Custom rules:
 * - fix: increment minor version
 * - feat: increment major version
 */
export const VERSION = {
  major: 0,
  minor: 0,
  patch: 1,
  toString: function() {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
};
