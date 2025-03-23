/**
 * Semantic versioning for the Moneybird MCP Server
 * Custom rules:
 * - fix: increment minor version
 * - feat: increment major version
 */
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 3,
  toString: function() {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
};
