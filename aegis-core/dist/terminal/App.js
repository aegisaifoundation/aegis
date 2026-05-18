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
    const [history, setHistory] = useState([]);
    const [currentResponse, setCurrentResponse] = useState('');
    const [status, setStatus] = useState('idle');
    const [toolLogs, setToolLogs] = useState([]);
    const [showDashboard, setShowDashboard] = useState(true);
    useEffect(() => {
        agent.on('chunk', (chunk) => {
            setCurrentResponse(prev => prev + chunk);
        });
        agent.on('status', (s) => {
            setStatus(s);
        });
        agent.on('tool_start', (msg) => {
            setToolLogs(prev => [...prev, `  > ${msg}`]);
        });
        agent.on('tool_end', (msg) => {
            setToolLogs(prev => [...prev, `  < ${String(msg).substring(0, 120)}`]);
        });
        agent.on('error', (msg) => {
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
    const handleSubmit = async (query) => {
        if (!query.trim())
            return;
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
    return (React.createElement(Box, { flexDirection: "column", width: "100%" },
        showDashboard ? (React.createElement(Dashboard, null)) : (React.createElement(Box, { flexDirection: "column", paddingX: 1, paddingTop: 1 },
            history.slice(-20).map((msg, idx) => (React.createElement(Box, { key: idx, flexDirection: "row", marginBottom: 0 },
                React.createElement(Text, { color: msg.role === 'user' ? C2 :
                        msg.role === 'system' ? '#ffcc00' : C1, bold: true }, msg.role === 'user' ? 'USER   > ' :
                    msg.role === 'system' ? 'SYS    > ' :
                        'AEGIS  > '),
                React.createElement(Text, { color: msg.role === 'user' ? 'white' :
                        msg.role === 'system' ? '#ffcc00' : C2 }, msg.text)))),
            currentResponse !== '' && (React.createElement(Box, { flexDirection: "row" },
                React.createElement(Text, { color: C1, bold: true }, 'AEGIS  > '),
                React.createElement(Text, { color: C2 }, currentResponse))),
            toolLogs.length > 0 && (React.createElement(Box, { flexDirection: "column", borderStyle: "single", borderColor: C3, marginTop: 1, paddingX: 1 },
                React.createElement(Text, { color: C2, bold: true }, "SYSTEM LOG"),
                toolLogs.slice(-6).map((log, i) => (React.createElement(Text, { key: i, color: C1 }, log))))))),
        React.createElement(Box, { flexDirection: "row", justifyContent: "space-between", paddingX: 1, paddingY: 1, marginTop: 1, width: "100%", borderStyle: "single", borderColor: BLUE },
            React.createElement(Box, { flexDirection: "row", flexGrow: 1, paddingRight: 1 },
                React.createElement(Text, { color: BLUE, bold: true }, 'AEGIS> '),
                React.createElement(Text, { color: BLUE }, '  '),
                React.createElement(Box, { flexGrow: 1 },
                    React.createElement(TextInput, { value: input, onChange: setInput, onSubmit: handleSubmit, placeholder: status === 'idle'
                            ? 'Type your command or message...'
                            : 'Thinking... press Enter to interrupt' }))),
            React.createElement(Box, { flexShrink: 0 },
                React.createElement(Text, { color: BLUE }, '[ /help ] [ /tools ] [ /status ] [ /exit ]')))));
};
