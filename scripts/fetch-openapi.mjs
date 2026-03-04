#!/usr/bin/env node

/**
 * Fetches the OpenAPI spec from a running Trazo server and writes it to schemas/openapi.json.
 *
 * Usage:
 *   node scripts/fetch-openapi.mjs                  # fetch from localhost:8080
 *   node scripts/fetch-openapi.mjs --url http://...  # fetch from custom URL
 *   node scripts/fetch-openapi.mjs --fallback        # skip if server unreachable (CI)
 */

import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '..', 'schemas', 'openapi.json');

const args = process.argv.slice(2);
const fallback = args.includes('--fallback');
const urlIndex = args.indexOf('--url');
const serverUrl = urlIndex !== -1 ? args[urlIndex + 1] : 'http://localhost:8080';
const specUrl = `${serverUrl}/openapi.json`;

async function main() {
  console.log(`Fetching OpenAPI spec from ${specUrl}...`);

  try {
    const response = await fetch(specUrl, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const spec = await response.json();
    writeFileSync(outputPath, JSON.stringify(spec, null, 2) + '\n');
    console.log(`Written to ${outputPath}`);
    console.log(`  ${Object.keys(spec.paths || {}).length} paths found`);
  } catch (err) {
    if (fallback) {
      if (existsSync(outputPath)) {
        console.log(`Server unreachable. Using existing ${outputPath} (--fallback mode)`);
        return;
      }
      console.error(`Server unreachable and no existing spec found at ${outputPath}`);
      process.exit(1);
    }

    console.error(`Failed to fetch OpenAPI spec: ${err.message}`);
    console.error('Hint: Start the server first, or use --fallback to use the committed spec.');
    process.exit(1);
  }
}

main();
