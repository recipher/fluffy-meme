import 'dotenv/config';
import { program } from 'commander';

import go from './src/scrape/go.js';

const DOMAIN = 'https://sites.google.com';
const ROOT = '/a/safeguardworld.com';
const PAGE = '/knowledge-zone/home';

program
  .option('-p, --page <string>', '', PAGE)
  .option('-r, --root <string>', '', ROOT)
  .option('-t, --tags <string>')
  .option('-n, --navigate', '', false)
  .option('-d, --debug', '', false)
  .option('-h, --headless', '', false);

program.parse();

const { page, root, tags, navigate, headless, debug } = program.opts();

await go(page, { domain: DOMAIN, root, tags, navigate: !navigate, headless: !headless, debug });
