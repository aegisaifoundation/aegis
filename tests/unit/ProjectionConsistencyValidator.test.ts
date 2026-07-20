import { test } from 'node:test';
import assert from 'node:assert';
import { projectionConsistencyValidator } from '../../packages/aegis-memory/src/ProjectionConsistencyValidator.js';
import { SessionState } from '../../packages/aegis-memory/src/interfaces/MemoryTypes.js';

test('ProjectionConsistencyValidator - working-memory verification', () => {
  const state: SessionState = {
    sessionId: 'test-session',
    status: 'ACTIVE',
    currentObjective: 'Stabilize Aegis',
    activeTasks: ['Task A'],
    lastUpdatedAt: new Date().toISOString(),
    checkpointVersion: 1,
    temporaryExecutionContext: {
      'user.name': 'Gokul'
    }
  };

  const validContent = `
  ## Current Objective
  Stabilize Aegis

  ## Active Tasks
  - Task A

  ## Temporary Execution Context
  - **user.name**: Gokul
  `;

  const invalidContent = `
  ## Current Objective
  Different Objective

  ## Active Tasks
  - Task A

  ## Temporary Execution Context
  - **user.name**: Gokul
  `;

  const res1 = projectionConsistencyValidator.validateWorkingProjection(validContent, state);
  assert.strictEqual(res1.valid, true);

  const res2 = projectionConsistencyValidator.validateWorkingProjection(invalidContent, state);
  assert.strictEqual(res2.valid, false);
});
