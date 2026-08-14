import net from 'net';
import readline from 'readline';
import os from 'os';

const PORT = 9901;

// 1. Start TCP listener server
const server = net.createServer((socket) => {
  let buffer = Buffer.alloc(0);
  
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 4) {
      const payloadLen = buffer.readUInt32BE(0);
      if (buffer.length >= 4 + payloadLen) {
        const payloadStr = buffer.subarray(4, 4 + payloadLen).toString('utf8');
        buffer = buffer.subarray(4 + payloadLen);
        try {
          const parsed = JSON.parse(payloadStr);
          if (parsed.messageType === 'chat') {
            console.log(`\n[${parsed.senderId}]: ${parsed.payload.text}`);
            rl.prompt();
          }
        } catch (err) {
          console.error('\n[Error parsing incoming message]:', err.message);
        }
      } else {
        break;
      }
    }
  });

  socket.on('error', (err) => {
    console.error('\n[Connection error]:', err.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`P2P Chat Server listening on port ${PORT}...`);
  console.log(`====================================================`);
  console.log(`Commands:`);
  console.log(`  /connect <IP>   - Establish connection to target IP`);
  console.log(`  Type message and press Enter to send.`);
  console.log(`====================================================\n`);
  rl.prompt();
});

// 2. Interactive console input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'You > '
});

let activeConnection = null;

rl.on('line', (line) => {
  const input = line.trim();
  if (input.startsWith('/connect')) {
    const parts = input.split(' ');
    if (parts.length < 2) {
      console.log('Usage: /connect <IP>');
      rl.prompt();
      return;
    }
    const targetIp = parts[1];
    console.log(`Connecting to ${targetIp}:${PORT}...`);
    
    const client = net.connect(PORT, targetIp, () => {
      console.log(`Connected to ${targetIp}:${PORT} successfully!`);
      activeConnection = client;
      rl.prompt();
    });

    client.on('error', (err) => {
      console.error(`Failed to connect to ${targetIp}:`, err.message);
      activeConnection = null;
      rl.prompt();
    });

    client.on('close', () => {
      console.log('\nConnection closed.');
      activeConnection = null;
      rl.prompt();
    });
  } else if (input.length > 0) {
    if (!activeConnection) {
      console.log('No active connection. Use: /connect <IP> first.');
      rl.prompt();
      return;
    }

    const msgPayload = JSON.stringify({
      messageType: 'chat',
      senderId: os.hostname(),
      payload: { text: input }
    });

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(msgPayload.length, 0);
    activeConnection.write(Buffer.concat([lenBuf, Buffer.from(msgPayload)]));
    rl.prompt();
  } else {
    rl.prompt();
  }
});
