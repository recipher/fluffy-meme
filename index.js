import 'dotenv/config';
import { program } from 'commander';

import go from './src/scrape/go.js';

const DOMAIN = 'https://sites.google.com';
const ROOT = '/a/safeguardworld.com';
const PAGE = '/technical-knowledge-base/Home';

program
  .option('-p, --page <string>', '', PAGE)
  .option('-t, --tags <string>')
  .option('-n, --navigate', '', false)
  .option('-d, --debug', '', false)
  .option('-h, --headless', '', false);

program.parse();

const { page, tags, navigate, headless, debug } = program.opts();

await go(page, { domain: DOMAIN, root: ROOT, tags, navigate: !navigate, headless: !headless, debug });
