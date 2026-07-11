import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { terminalTransport } from '../../aegis-core/src/transports/index.js';
import { eventBus } from '../../aegis-core/src/runtime/index.js';
export const App = () => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]);
    const [currentResponse, setCurrentResponse] = useState('');
    const [status, setStatus] = useState('idle');
    useEffect(() => {
        const handleChunk = (envelope) => {
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
        const handleResponseFinished = (envelope) => {
            const finalText = envelope.payload;
            if (finalText && finalText.trim() !== '') {
                setHistory(prev => [...prev, { role: 'assistant', text: finalText }]);
            }
            setCurrentResponse('');
            setStatus('idle');
        };
        const handleToolStarted = (envelope) => {
            const msg = envelope.payload;
            setHistory(prev => [...prev, { role: 'system', text: `[Tool execution: ${msg.name} started]` }]);
        };
        const handleToolFinished = (envelope) => {
            const msg = envelope.payload;
            setHistory(prev => [...prev, { role: 'system', text: `[Tool execution: ${msg.name} finished]` }]);
        };
        const handleRuntimeError = (envelope) => {
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
    const handleSubmit = async (query) => {
        if (!query.trim())
            return;
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
    return (_jsxs(Box, { flexDirection: "column", padding: 1, children: [history.slice(-30).map((msg, idx) => (_jsxs(Box, { flexDirection: "row", marginBottom: 0, children: [_jsx(Text, { color: msg.role === 'user' ? 'cyan' :
                            msg.role === 'system' ? 'yellow' : 'green', bold: true, children: msg.role === 'user' ? 'You: ' :
                            msg.role === 'system' ? '' : 'Aegis: ' }), _jsx(Text, { color: msg.role === 'user' ? 'white' :
                            msg.role === 'system' ? 'yellow' : 'white', children: msg.text })] }, idx))), currentResponse !== '' && (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: "green", bold: true, children: "Aegis: " }), _jsx(Text, { color: "white", children: currentResponse })] })), _jsxs(Box, { flexDirection: "row", marginTop: 1, children: [_jsx(Text, { color: "cyan", bold: true, children: status === 'idle' ? '> ' : 'Thinking... [Enter to interrupt] > ' }), _jsx(TextInput, { value: input, onChange: setInput, onSubmit: handleSubmit })] })] }));
};
