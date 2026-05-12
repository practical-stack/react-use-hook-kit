#!/usr/bin/env node
// Initialize a project from this template.
//   Deletes docs/ (template-only setup guide)
// Usage: node scripts/init.mts

import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  '..',
)

function main(): void {
  const docsDir = path.join(ROOT, 'docs')
  if (fs.existsSync(docsDir)) {
    fs.rmSync(docsDir, { recursive: true, force: true })
    console.log('  removed docs/')
  } else {
    console.log('  docs/ already removed')
  }

  console.log('\nDone.')
}

main()
