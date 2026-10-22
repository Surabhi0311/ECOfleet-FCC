const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
test('course stack and lifecycle routes are present', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/api.js'), 'utf8');
  for (const route of ['/auth/login', '/requests', '/routes/plan', '/disposals', '/reports', '/files']) assert.ok(source.includes(route), `missing ${route}`);
});
