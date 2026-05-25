import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { terminalTransport } from '../../aegis-core/src/transports/index.js';
import { eventBus } from '../../aegis-core/src/runtime/index.js';

export const App = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ role: string; text: string }[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const handleChunk = (envelope: any) => {
      setCurrentResponse(prev => prev + envelope.payload);
    };

    const handleThinkingStarted = () => {
      setStatus('thinking');
    };

    const handleThinkingFinished = () => {
      setStatus('idle');
    };

    const handleResponseStarted = () => {
      setCurrentResponse('');
      setStatus('thinking');
    };

    const handleResponseFinished = (envelope: any) => {
      const finalText = envelope.payload;
      if (finalText && finalText.trim() !== '') {
        setHistory(prev => [...prev, { role: 'assistant', text: finalText }]);
      }
      setCurrentResponse('');
      setStatus('idle');
    };

    const handleToolStarted = (envelope: any) => {
      const msg = envelope.payload;
      setHistory(prev => [...prev, { role: 'system', text: `[Tool execution: ${msg.name} started]` }]);
    };

    const handleToolFinished = (envelope: any) => {
      const msg = envelope.payload;
      setHistory(prev => [...prev, { role: 'system', text: `[Tool execution: ${msg.name} finished]` }]);
    };

    const handleRuntimeError = (envelope: any) => {
      const msg = envelope.payload;
      setHistory(prev => [...prev, { role: 'system', text: `[Runtime Error: ${msg}]` }]);
      setStatus('idle');
    };

    const handleInterrupt = () => {
      setHistory(prev => [...prev, { role: 'system', text: `[Interrupted]` }]);
      setStatus('idle');
    };

    eventBus.on('response_chunk', handleChunk);
    eventBus.on('thinking_started', handleThinkingStarted);
    eventBus.on('thinking_finished', handleThinkingFinished);
    eventBus.on('response_started', handleResponseStarted);
    eventBus.on('response_finished', handleResponseFinished);
    eventBus.on('tool_started', handleToolStarted);
    eventBus.on('tool_finished', handleToolFinished);
    eventBus.on('runtime_error', handleRuntimeError);
    eventBus.on('interrupt', handleInterrupt);

    return () => {
      eventBus.off('response_chunk', handleChunk);
      eventBus.off('thinking_started', handleThinkingStarted);
      eventBus.off('thinking_finished', handleThinkingFinished);
      eventBus.off('response_started', handleResponseStarted);
      eventBus.off('response_finished', handleResponseFinished);
      eventBus.off('tool_started', handleToolStarted);
      eventBus.off('tool_finished', handleToolFinished);
      eventBus.off('runtime_error', handleRuntimeError);
      eventBus.off('interrupt', handleInterrupt);
    };
  }, []);

  const handleSubmit = async (query: string) => {
    if (!query.trim()) return;

    if (status !== 'idle') {
      terminalTransport.sendInterrupt();
      setInput('');
      return;
    }

    setHistory(prev => [...prev, { role: 'user', text: query }]);
    setInput('');

    terminalTransport.sendInput(query).catch(err => {
      setHistory(prev => [...prev, { role: 'system', text: `[System Error: ${err.message || err}]` }]);
    });
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Scrollable Message History */}
      {history.slice(-30).map((msg, idx) => (
        <Box key={idx} flexDirection="row" marginBottom={0}>
          <Text color={
            msg.role === 'user' ? 'cyan' :
            msg.role === 'system' ? 'yellow' : 'green'
          } bold>
            {msg.role === 'user' ? 'You: ' :
             msg.role === 'system' ? '' : 'Aegis: '}
          </Text>
          <Text color={
            msg.role === 'user' ? 'white' :
            msg.role === 'system' ? 'yellow' : 'white'
          }>{msg.text}</Text>
        </Box>
      ))}

      {/* Current Streaming Output */}
      {currentResponse !== '' && (
        <Box flexDirection="row">
          <Text color="green" bold>Aegis: </Text>
          <Text color="white">{currentResponse}</Text>
        </Box>
      )}

      {/* Input Prompter */}
      <Box flexDirection="row" marginTop={1}>
        <Text color="cyan" bold>
          {status === 'idle' ? '> ' : 'Thinking... [Enter to interrupt] > '}
        </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  );
};
