import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';

const LOG_FILE = 'workspace/logs/chat_history.log';

// Ensure workspace/logs/ directory exists and log file is touched
try {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '', 'utf8');
  }
} catch {}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node scratch_chat.js <targetNodeId>');
  process.exit(1);
}
const targetNodeId = args[0];

console.log(`====================================================`);
console.log(`AEGIS Interactive P2P Chat Client`);
console.log(`Target Peer: Node "${targetNodeId}"`);
console.log(`====================================================`);
console.log(`Type a message and press Enter to send.`);
console.log(`====================================================\n`);

// Start tailing the chat log
let logSize = fs.statSync(LOG_FILE).size;
setInterval(() => {
  try {
    const stats = fs.statSync(LOG_FILE);
    if (stats.size > logSize) {
      const fd = fs.openSync(LOG_FILE, 'r');
      const buffer = Buffer.alloc(stats.size - logSize);
      fs.readSync(fd, buffer, 0, buffer.length, logSize);
      fs.closeSync(fd);
      logSize = stats.size;

      const lines = buffer.toString('utf8').trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log(`\n${line}`);
        }
      }
      rl.prompt();
    }
  } catch (err) {}
}, 500);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'You > '
});

rl.prompt();

rl.on('line', (line) => {
  const text = line.trim();
  if (text.length > 0) {
    try {
      const escapedText = text.replace(/"/g, '\\"');
      const out = execSync(`node apps/aegis-cli/dist/index.js node send-message "${targetNodeId}" "${escapedText}"`, { encoding: 'utf8' });
      if (out.includes('Failed')) {
        console.log(`\n[AEGIS CLI Error Output]:\n${out.trim()}`);
      }
    } catch (err) {
      console.error(`\n[Failed to send message via AEGIS]:`);
      console.error(err.message);
      if (err.stdout) console.error(`CLI Output: ${err.stdout.trim()}`);
      if (err.stderr) console.error(`CLI Error: ${err.stderr.trim()}`);
    }
  }
  rl.prompt();
});
