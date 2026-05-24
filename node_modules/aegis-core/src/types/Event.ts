export type RuntimeEvent =
  | 'thinking_started'
  | 'thinking_finished'
  | 'response_started'
  | 'response_chunk'
  | 'response_finished'
  | 'tool_started'
  | 'tool_finished'
  | 'loop_step'
  | 'interrupt'
  | 'runtime_error';
