import normalize from './normalize.js';
import buildTimeline from './buildTimeline.js';
import getLatestEncounter from './getLatestEncounter.js';
export default {
    name: 'PatientDataTool',
    version: '1.0.0',
    description: 'Deterministic helpers for shaping and analyzing patient record data. Actions: normalize, buildTimeline, getLatestEncounter.',
    actions: {
        normalize,
        buildTimeline,
        getLatestEncounter
    }
};
