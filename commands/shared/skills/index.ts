import execute from './execute.js';
import manifest from './command.json' assert { type: 'json' };

export default {
  ...manifest,
  execute
};
