import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.chdir(__dirname)

const TARGET = process.cwd();
const HASH_FILE = path.join(TARGET, '.packageHash')

const TRACKED = ['package.json', 'pnpm-lock.yaml', 'npmrc']

const hash = createHash('sha256')

for (const file of TRACKED) {
    if (existsSync(file)) {
        hash.update(readFileSync(file))
    }
}

const currentHash = hash.digest('hex')
const previousHash = existsSync(HASH_FILE) 
    ? readFileSync(HASH_FILE, 'utf8')
    : ''

if (
    currentHash !== previousHash 
    || !existsSync('node_modules')
) {
    try {
        execSync('pnpm install --prod --no-frozen-lockfile', { stdio: 'inherit' })
        writeFileSync(HASH_FILE, currentHash)
        console.log('Successfully updated shared dependencies')
    } catch (err) {
        console.error('Failed to install shared dependencies')
    }
} else console.log('Skipping shared install, files unchanged')