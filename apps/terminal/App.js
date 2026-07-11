"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ink_1 = require("ink");
const ink_text_input_1 = __importDefault(require("ink-text-input"));
const index_js_1 = require("../../aegis-core/src/transports/index.js");
const index_js_2 = require("../../aegis-core/src/runtime/index.js");
const Dashboard_js_1 = require("./Dashboard.js");
const C1 = '#168dff';
const C2 = '#6bd5ff';
const C3 = '#0752a8';
const BLUE = '#168dff';
const App = () => {
    const [input, setInput] = (0, react_1.useState)('');
    const [history, setHistory] = (0, react_1.useState)([]);
    const [currentResponse, setCurrentResponse] = (0, react_1.useState)('');
    const [status, setStatus] = (0, react_1.useState)('idle');
    const [toolLogs, setToolLogs] = (0, react_1.useState)([]);
    const [showDashboard, setShowDashboard] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        const handleChunk = (chunk) => {
            setCurrentResponse(prev => prev + chunk);
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
        const handleResponseFinished = (finalText) => {
            if (finalText.trim() !== '') {
                setHistory(prev => [...prev, { role: 'assistant', text: finalText }]);
            }
            setCurrentResponse('');
            setStatus('idle');
        };
        const handleToolStarted = (msg) => {
            setToolLogs(prev => [...prev, `  > Executing ${msg.name}...`]);
        };
        const handleToolFinished = (msg) => {
            setToolLogs(prev => [...prev, `  < ${msg.name} execution finished`]);
        };
        const handleRuntimeError = (msg) => {
            setToolLogs(prev => [...prev, `  ! ERROR: ${msg}`]);
            setStatus('idle');
        };
        const handleInterrupt = () => {
            setToolLogs(prev => [...prev, `  ! Interrupted`]);
            setStatus('idle');
        };
        index_js_2.eventBus.on('response_chunk', handleChunk);
        index_js_2.eventBus.on('thinking_started', handleThinkingStarted);
        index_js_2.eventBus.on('thinking_finished', handleThinkingFinished);
        index_js_2.eventBus.on('response_started', handleResponseStarted);
        index_js_2.eventBus.on('response_finished', handleResponseFinished);
        index_js_2.eventBus.on('tool_started', handleToolStarted);
        index_js_2.eventBus.on('tool_finished', handleToolFinished);
        index_js_2.eventBus.on('runtime_error', handleRuntimeError);
        index_js_2.eventBus.on('interrupt', handleInterrupt);
        return () => {
            index_js_2.eventBus.off('response_chunk', handleChunk);
            index_js_2.eventBus.off('thinking_started', handleThinkingStarted);
            index_js_2.eventBus.off('thinking_finished', handleThinkingFinished);
            index_js_2.eventBus.off('response_started', handleResponseStarted);
            index_js_2.eventBus.off('response_finished', handleResponseFinished);
            index_js_2.eventBus.off('tool_started', handleToolStarted);
            index_js_2.eventBus.off('tool_finished', handleToolFinished);
            index_js_2.eventBus.off('runtime_error', handleRuntimeError);
            index_js_2.eventBus.off('interrupt', handleInterrupt);
        };
    }, []);
    const handleSubmit = async (query) => {
        if (!query.trim())
            return;
        if (status !== 'idle') {
            index_js_1.terminalTransport.sendInterrupt();
            setInput('');
            return;
        }
        setShowDashboard(false);
        setHistory(prev => [...prev, { role: 'user', text: query }]);
        setInput('');
        index_js_1.terminalTransport.sendInput(query).catch(err => {
            setToolLogs(prev => [...prev, `  ! ERROR: ${err.message || err}`]);
        });
    };
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", width: "100%", children: [showDashboard ? ((0, jsx_runtime_1.jsx)(Dashboard_js_1.Dashboard, {})) : ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", paddingX: 1, paddingTop: 1, children: [history.slice(-20).map((msg, idx) => ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", marginBottom: 0, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: msg.role === 'user' ? C2 :
                                    msg.role === 'system' ? '#ffcc00' : C1, bold: true, children: msg.role === 'user' ? 'USER   > ' :
                                    msg.role === 'system' ? 'SYS    > ' :
                                        'AEGIS  > ' }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: msg.role === 'user' ? 'white' :
                                    msg.role === 'system' ? '#ffcc00' : C2, children: msg.text })] }, idx))), currentResponse !== '' && ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: C1, bold: true, children: 'AEGIS  > ' }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: C2, children: currentResponse })] })), toolLogs.length > 0 && ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderStyle: "single", borderColor: C3, marginTop: 1, paddingX: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: C2, bold: true, children: "SYSTEM LOG" }), toolLogs.slice(-6).map((log, i) => ((0, jsx_runtime_1.jsx)(ink_1.Text, { color: C1, children: log }, i)))] }))] })), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", justifyContent: "space-between", paddingX: 1, paddingY: 1, marginTop: 1, width: "100%", borderStyle: "single", borderColor: BLUE, children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", flexGrow: 1, paddingRight: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: BLUE, bold: true, children: 'AEGIS> ' }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BLUE, children: '  ' }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexGrow: 1, children: (0, jsx_runtime_1.jsx)(ink_text_input_1.default, { value: input, onChange: setInput, onSubmit: handleSubmit, placeholder: status === 'idle'
                                        ? 'Type your command or message...'
                                        : 'Thinking... press Enter to interrupt' }) })] }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexShrink: 0, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BLUE, children: '[ /help ] [ /tools ] [ /memory ] [ /exit ]' }) })] })] }));
};
exports.App = App;
