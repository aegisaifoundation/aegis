import save from './save.js';
import retrieve from './retrieve.js';
import clear from './clear.js';

export default {
  name: 'MemoryTool',
  version: '1.0.0',
  description: 'Interact with the agent\'s memory. Actions: save, retrieve, clear.',
  actions: {
    save,
    retrieve,
    clear
  }
};
