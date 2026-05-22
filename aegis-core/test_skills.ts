import { bootstrapManager } from './src/runtime/BootstrapManager.js';
import { skillRegistry, SkillState } from './src/skills/index.js';
import { modelHandler } from './src/models/index.js';
import { eventBus } from './src/runtime/EventBus.js';

async function runSkillTests() {
  console.log('=== AEGIS SKILL SYSTEM TESTING ===');

  // Track event emissions
  const eventsEmitted: string[] = [];
  eventBus.on('skill_execute_started', (data) => {
    eventsEmitted.push(`started:${data.name}`);
    console.log(`[Event] skill_execute_started: ${data.name}`);
  });
  eventBus.on('skill_executed', (data) => {
    eventsEmitted.push(`executed:${data.name}`);
    console.log(`[Event] skill_executed: ${data.name}`);
  });
  eventBus.on('skill_failed', (data) => {
    eventsEmitted.push(`failed:${data.name}`);
    console.log(`[Event] skill_failed: ${data.name} - Error: ${data.error}`);
  });

  // 1. Mock the ModelHandler to keep testing independent of Ollama running status
  const originalGenerate = modelHandler.generate.bind(modelHandler);
  modelHandler.generate = async (prompt: string): Promise<string> => {
    console.log(`[Mock LLM] Prompt received:\n"""\n${prompt.trim()}\n"""`);
    
    if (prompt.includes('summarize') || prompt.includes('Summarize')) {
      return 'Summary: Patient John Doe was seen by Dr. Sarah Jenkins on May 20, 2026.';
    }
    if (prompt.includes('Schema to follow') || prompt.includes('extract') || prompt.includes('Extract')) {
      // Return JSON, sometimes with markdown wrapping to test extractor robust cleanup
      return `
Some conversational preface...
\`\`\`json
{
  "doctorName": "Dr. Sarah Jenkins",
  "patientName": "John Doe",
  "visitDate": "May 20, 2026"
}
\`\`\`
Some conversational postface...`;
    }
    if (prompt.includes('generate') || prompt.includes('Generate') || prompt.includes('controlled text generation')) {
      return 'Generated: Referral letter for John Doe to Cardiology department.';
    }
    return 'Default LLM Mock Output';
  };

  // 2. Bootstrap the AEGIS system (loads plugins, commands, tools, and autoloads skills)
  console.log('\nBootstrapping AEGIS core...');
  await bootstrapManager.bootstrap();

  // 3. Verify skills registry
  const loadedSkills = skillRegistry.list();
  console.log(`\nLoaded Skills (${loadedSkills.length}):`);
  for (const s of loadedSkills) {
    const state = skillRegistry.getSkillState(s.name);
    console.log(`- ${s.name} (v${s.version}) [State: ${state}]: ${s.description}`);
    if (state !== SkillState.ACTIVE) {
      throw new Error(`Skill ${s.name} is not in ACTIVE state! Current state: ${state}`);
    }
  }

  const expectedSkills = ['summarize', 'extract', 'format', 'generate'];
  for (const exp of expectedSkills) {
    if (!loadedSkills.find(s => s.name === exp)) {
      throw new Error(`Expected skill '${exp}' was not loaded!`);
    }
  }
  console.log('Skill loading check: PASSED.');

  // 4. Test SUMMARIZE Skill
  console.log('\n--- Testing SUMMARIZE Skill ---');
  const summaryResult = await skillRegistry.executeSkill('summarize', {
    text: 'Dr. Sarah Jenkins saw patient John Doe on May 20th, 2026. The patient reported mild headaches but normal vitals.'
  });
  console.log('Result:', summaryResult);
  if (!summaryResult.summary.includes('John Doe')) {
    throw new Error('Summarize skill execution output is invalid.');
  }
  console.log('SUMMARIZE test: PASSED.');

  // 5. Test EXTRACT Skill (Schema enforcement, markdown stripping, safe JSON parse)
  console.log('\n--- Testing EXTRACT Skill ---');
  const schema = {
    doctorName: 'string',
    patientName: 'string',
    visitDate: 'string',
    missingField: 'string' // This should get normalized to null/empty string as it is not in the mock output
  };
  const extractResult = await skillRegistry.executeSkill('extract', {
    text: 'Dr. Sarah Jenkins saw patient John Doe on May 20th, 2026.',
    schema
  });
  console.log('Result:', extractResult);
  if (extractResult.data.doctorName !== 'Dr. Sarah Jenkins' || extractResult.data.patientName !== 'John Doe') {
    throw new Error('Extract skill failed to parse or extract fields properly.');
  }
  if (!('missingField' in extractResult.data) || extractResult.data.missingField !== null) {
    throw new Error('Extract skill schema enforcement failed to handle missing keys with defaults.');
  }
  console.log('EXTRACT test: PASSED.');

  // 6. Test FORMAT Skill (Programmatic parsing, cleaning, markdown headers space normalization)
  console.log('\n--- Testing FORMAT Skill ---');
  const formatText = `
##Header With Bad Spacing
Some text with    multiple spaces.

\`\`\`json
{
  "key": "value"
}
\`\`\`

assistant: Hello there.
`;
  
  const formatResult = await skillRegistry.executeSkill('format', {
    content: formatText,
    action: 'all'
  });
  console.log('Result formatted output:\n', formatResult.formatted);
  if (!formatResult.formatted.includes('## Header With Bad Spacing')) {
    throw new Error('Format skill failed to normalize markdown header spacing.');
  }
  if (formatResult.formatted.includes('assistant:')) {
    throw new Error('Format skill failed to sanitize assistant tag prefix.');
  }
  console.log('FORMAT test: PASSED.');

  // 7. Test GENERATE Skill (Controlled template interpolation)
  console.log('\n--- Testing GENERATE Skill ---');
  const generatePrompt = 'Generate a referral letter for {{patientName}} to {{department}} department.';
  const generateVariables = {
    patientName: 'John Doe',
    department: 'Cardiology'
  };
  const generateResult = await skillRegistry.executeSkill('generate', {
    prompt: generatePrompt,
    variables: generateVariables
  });
  console.log('Result:', generateResult);
  if (!generateResult.generated.includes('Referral letter')) {
    throw new Error('Generate skill output is invalid.');
  }
  console.log('GENERATE test: PASSED.');

  // 8. Verify Event Emissions
  console.log('\nChecking Event emissions...');
  const expectedEvents = [
    'started:summarize', 'executed:summarize',
    'started:extract', 'executed:extract',
    'started:format', 'executed:format',
    'started:generate', 'executed:generate'
  ];
  for (const ev of expectedEvents) {
    if (!eventsEmitted.includes(ev)) {
      throw new Error(`Expected event emission '${ev}' was not detected!`);
    }
  }
  console.log('Event emissions check: PASSED.');

  // 9. Verify Failure Isolation (Ensure a crashing skill does not crash the core system)
  console.log('\n--- Testing FAILURE ISOLATION ---');
  try {
    await skillRegistry.executeSkill('summarize', null); // Should throw because input is null
    throw new Error('Skill execution should have failed but did not!');
  } catch (err: any) {
    console.log('Caught expected error from skill:', err.message);
  }
  if (!eventsEmitted.includes('failed:summarize')) {
    throw new Error('Event skill_failed was not fired during execution failure!');
  }
  console.log('FAILURE ISOLATION test: PASSED.');

  console.log('\n=== ALL AEGIS SKILL SYSTEM TESTS PASSED SUCCESSFULLY ===');
}

runSkillTests().catch(err => {
  console.error('\nSkill system testing FAILED:', err);
  process.exit(1);
});
