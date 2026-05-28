import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

async function run() {
  try {
    console.log('Sending generate request with model "gemma4"...');
    const response = await ollama.generate({
      model: 'gemma4',
      prompt: 'hi',
    });
    console.log('Response:', response.response);
  } catch (err) {
    console.error('Error occurred:', err);
  }
}

run();
