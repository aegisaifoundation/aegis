import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { agent } from '../agent/index.js';
import { commandRouter } from '../commands/index.js';
import { Dashboard } from './Dashboard.js';

const C1 = '#168dff';
const C2 = '#6bd5ff';
const C3 = '#0752a8';
const BLUE = '#168dff';

export const App = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ role: string; text: string }[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [status, setStatus] = useState('idle');
  const [toolLogs, setToolLogs] = useState<string[]>([]);
  const [showDashboard, setShowDashboard] = useState(true);

  useEffect(() => {
    agent.on('chunk', (chunk: string) => {
      setCurrentResponse(prev => prev + chunk);
    });

    agent.on('status', (s: string) => {
      setStatus(s);
    });

    agent.on('tool_start', (msg: string) => {
      setToolLogs(prev => [...prev, `  > ${msg}`]);
    });

    agent.on('tool_end', (msg: string) => {
      setToolLogs(prev => [...prev, `  < ${String(msg).substring(0, 120)}`]);
    });

    agent.on('error', (msg: string) => {
      setToolLogs(prev => [...prev, `  ! ERROR: ${msg}`]);
    });

    return () => { agent.removeAllListeners(); };
  }, []);

  // Flush streamed response into history when agent goes idle
  useEffect(() => {
    if (status === 'idle' && currentResponse.trim() !== '') {
      setHistory(prev => [...prev, { role: 'assistant', text: currentResponse }]);
      setCurrentResponse('');
    }
  }, [status]);

  const handleSubmit = async (query: string) => {
    if (!query.trim()) return;

    if (status !== 'idle') {
      agent.interrupt();
      setInput('');
      return;
    }

    setShowDashboard(false);

    const commandRes = await commandRouter.handleCommand(query);
    if (commandRes) {
      setHistory(prev => [
        ...prev,
        { role: 'user', text: query },
        { role: 'system', text: commandRes },
      ]);
      setInput('');
      return;
    }

    setHistory(prev => [...prev, { role: 'user', text: query }]);
    setInput('');
    await agent.processInput(query);
  };

  return (
    <Box flexDirection="column" width="100%">

      {/* ── Main content ─────────────────────────────────────────────── */}
      {showDashboard ? (
        <Dashboard />
      ) : (
        <Box flexDirection="column" paddingX={1} paddingTop={1}>
          {/* Chat history */}
          {history.slice(-20).map((msg, idx) => (
            <Box key={idx} flexDirection="row" marginBottom={0}>
              <Text color={
                msg.role === 'user' ? C2 :
                  msg.role === 'system' ? '#ffcc00' : C1
              } bold>
                {msg.role === 'user' ? 'USER   > ' :
                  msg.role === 'system' ? 'SYS    > ' :
                    'AEGIS  > '}
              </Text>
              <Text color={
                msg.role === 'user' ? 'white' :
                  msg.role === 'system' ? '#ffcc00' : C2
              }>
                {msg.text}
              </Text>
            </Box>
          ))}

          {/* Live streaming response */}
          {currentResponse !== '' && (
            <Box flexDirection="row">
              <Text color={C1} bold>{'AEGIS  > '}</Text>
              <Text color={C2}>{currentResponse}</Text>
            </Box>
          )}

          {/* Tool logs */}
          {toolLogs.length > 0 && (
            <Box flexDirection="column" borderStyle="single" borderColor={C3} marginTop={1} paddingX={1}>
              <Text color={C2} bold>SYSTEM LOG</Text>
              {toolLogs.slice(-6).map((log, i) => (
                <Text key={i} color={C1}>{log}</Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ── Bottom Bar — exactly matches the image ────────────────────── */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        paddingX={1}
        paddingY={1}
        marginTop={1}
        width="100%"
        borderStyle="single"
        borderColor={BLUE}
      >
        {/* Left: AEGIS> cursor input */}
        <Box flexDirection="row" flexGrow={1} paddingRight={1}>
          <Text color={BLUE} bold>{'AEGIS> '}</Text>
          <Text color={BLUE}>{'  '}</Text>
          <Box flexGrow={1}>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder={
                status === 'idle'
                  ? 'Type your command or message...'
                  : 'Thinking... press Enter to interrupt'
              }
            />
          </Box>
        </Box>
        {/* Right: keyboard shortcuts */}
        <Box flexShrink={0}>
          <Text color={BLUE}>{'[ /help ] [ /tools ] [ /status ] [ /exit ]'}</Text>
        </Box>
      </Box>
    </Box>
  );
};
