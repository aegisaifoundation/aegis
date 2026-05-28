import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

async function run() {
  try {
    console.log('Sending chat request with model "gemma4"...');
    const response = await ollama.chat({
      model: 'gemma4',
      messages: [{ role: 'user', content: 'hi' }],
      stream: false,
    });
    console.log('Response:', response.message.content);
  } catch (err) {
    console.error('Error occurred:', err);
  }
}

run();
