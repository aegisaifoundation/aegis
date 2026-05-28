import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

async function run() {
  const model = 'gemma4';
  const messages = [
    { role: 'user', content: 'hi' }
  ];

  try {
    console.log('Requesting chat stream...');
    const response = await ollama.chat({
      model: model,
      messages: messages,
      stream: true,
    });

    console.log('Iterating over stream parts:');
    for await (const part of response) {
      process.stdout.write(part.message.content);
    }
    console.log('\nStream finished successfully.');
  } catch (err) {
    console.error('\nError during stream:', err);
  }
}

run();
