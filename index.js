import 'dotenv/config';
import { program } from 'commander';
import go from './src/load/go.js';

const DOMAIN = 'https://sites.google.com';
const ROOT = '/a/safeguardworld.com';
const PAGE = '/knowledge-zone/home/about-knowledge-management';

program
  .option('-p, --page <string>', '', PAGE)
  .option('-t, --tags <string>')
  .option('-d, --debug', '', false)
  .option('-h, --headless', '', false);

program.parse();

const { page, tags, headless, debug } = program.opts();

await go(page, { domain: DOMAIN, root: ROOT, tags, headless: !headless, debug });
