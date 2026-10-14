// Regenerates src/generated/HandlerRegistry.ts from src/root.yaml (or verifies it with --check).
//
// Calls CEF's generator directly: the `cef-gen-handlers` bin (v1.0.19) exits 0 without writing
// anything when launched via npm/npx, because its direct-execution guard compares the
// node_modules/.bin symlink path with the real file path.
const fs = require('node:fs');
const path = require('node:path');
const {
  generateHandlerRegistry,
} = require('commoneventframework/dist/script/generateHandlerRegistry');

const ROOT_YAML = 'src/root.yaml';
const REGISTRY = path.join('src', 'generated', 'HandlerRegistry.ts');

if (!process.argv.includes('--check')) {
  generateHandlerRegistry({ rootYaml: ROOT_YAML, outFile: REGISTRY });
  return;
}

// Generate next to the real file so relative import paths are identical, then compare.
const probe = path.join('src', 'generated', '.HandlerRegistry.check.ts');
try {
  generateHandlerRegistry({ rootYaml: ROOT_YAML, outFile: probe });
  const expected = fs.readFileSync(probe, 'utf8');
  const actual = fs.existsSync(REGISTRY) ? fs.readFileSync(REGISTRY, 'utf8') : '';
  if (expected !== actual) {
    console.error(`[codegen:check] ${REGISTRY} is stale. Run: npm run codegen -w @leaveflow/api`);
    process.exitCode = 1;
  } else {
    console.log('[codegen:check] HandlerRegistry.ts matches root.yaml.');
  }
} finally {
  fs.rmSync(probe, { force: true });
}
