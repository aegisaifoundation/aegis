import { test } from 'node:test';
import assert from 'node:assert';
import { projectionGenerator } from '../../packages/aegis-memory/src/ProjectionGenerator.js';
import { SessionState } from '../../packages/aegis-memory/src/interfaces/MemoryTypes.js';

test('ProjectionGenerator - generateWorkingMemoryProjection', () => {
  const state: SessionState = {
    sessionId: 'test-session-123',
    status: 'ACTIVE',
    currentObjective: 'Stabilize the core runtime',
    activeTasks: ['Task A', 'Task B'],
    lastUpdatedAt: new Date().toISOString(),
    checkpointVersion: 1,
    temporaryExecutionContext: {
      'user.name': 'Gokul',
      'preference.theme': 'dark'
    }
  };

  const workingProj = projectionGenerator.generateWorkingMemoryProjection(state);
  
  assert.ok(workingProj.includes('- goal:'));
  assert.ok(workingProj.includes('- current objective:'));
  assert.ok(workingProj.includes('Stabilize the core runtime'));
  assert.ok(workingProj.includes('## Temporary Execution Context'));
  assert.ok(workingProj.includes('- **user.name**: Gokul'));
  assert.ok(workingProj.includes('- **preference.theme**: dark'));

  const taskProj = projectionGenerator.generateTaskProjection(state);
  assert.ok(taskProj.includes('# Active Tasks'));
  assert.ok(taskProj.includes('[ ] Task A'));
  assert.ok(taskProj.includes('[ ] Task B'));
});

test('ProjectionGenerator - generateSessionMemoryProjection', () => {
  const state: SessionState = {
    sessionId: 'test-session-123',
    status: 'ACTIVE',
    currentObjective: 'Stabilize the core runtime',
    activeTasks: [],
    lastUpdatedAt: new Date().toISOString(),
    checkpointVersion: 1,
    preferences: {
      'editor.fontSize': 14
    },
    stableFacts: ['Node.js test runner is awesome']
  };

  const sessionProj = projectionGenerator.generateSessionMemoryProjection(state);

  assert.ok(sessionProj.includes('## Goals'));
  assert.ok(sessionProj.includes('**Current Goal**: Stabilize the core runtime'));
  assert.ok(sessionProj.includes('## Preferences'));
  assert.ok(sessionProj.includes('- **editor.fontSize**: 14'));
  assert.ok(sessionProj.includes('## Stable Facts'));
  assert.ok(sessionProj.includes('- Node.js test runner is awesome'));
});

test('ProjectionGenerator - token budget limits', () => {
  const content = 'word '.repeat(1200); // 1200 words
  const validated = projectionGenerator.validateProjectionSize(content, 1000);
  assert.strictEqual(validated, false);

  const trimmed = projectionGenerator.trimProjection(content, 1000);
  const wordsCount = trimmed.trim().split(/\s+/).length;
  assert.ok(wordsCount <= 1010); // allowing a small buffer for "[TRUNCATED...]" text
});
