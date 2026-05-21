import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { config } from '../../aegis-core/src/config/index.js';
import { AEGIS_TITLE, EKG_LEFT, EKG_RIGHT, MINI_EKG_SHIELD, SHIELD_ART } from './art.js';
const BLUE = '#168dff';
const DIM_BLUE = '#0c03ffff';
const BRIGHT_BLUE = '#6bd5ff';
const BLUE_GRADIENT = ['#8feaff', '#53c7ff', '#168dff', '#0b63d1', '#063f91'];
const diagonalGradientColor = (row, column, rowCount, columnCount) => {
    if (rowCount <= 1 && columnCount <= 1)
        return BLUE;
    const rowRatio = rowCount <= 1 ? 0 : row / (rowCount - 1);
    const columnRatio = columnCount <= 1 ? 0 : column / (columnCount - 1);
    const diagonalRatio = (rowRatio + columnRatio) / 2;
    const colorIndex = Math.round(diagonalRatio * (BLUE_GRADIENT.length - 1));
    return BLUE_GRADIENT[colorIndex];
};
const DiagonalGradientArt = ({ lines, bold = false }) => {
    const width = Math.max(...lines.map(line => line.length));
    return (_jsx(_Fragment, { children: lines.map((line, row) => (_jsx(Box, { flexDirection: "row", children: [...line].map((char, column) => (_jsx(Text, { color: diagonalGradientColor(row, column, lines.length, width), bold: bold, children: char }, column))) }, row))) }));
};
const tools = [
    ['file_read', 'Read files from the system'],
    ['file_write', 'Write content to files'],
    ['file_edit', 'Edit existing files'],
    ['file_list', 'List directories and files'],
    ['terminal_exec', 'Execute terminal commands'],
    ['system_info', 'System information & stats'],
    ['memory_save', 'Save information to memory'],
    ['memory_search', 'Search stored memories'],
    ['web_search', 'Search the web'],
    ['calculator', 'Perform calculations'],
    ['clock', 'Show current date & time'],
    ['help', 'Show help information'],
];
const capabilities = [
    'Natural language understanding',
    'Tool orchestration & execution',
    'Context aware reasoning',
    'Persistent memory',
    'Safe command execution',
    'Extensible plugin system',
    'Future multi-agent support',
];
const InfoRow = ({ icon, label, value }) => (_jsxs(Box, { flexDirection: "row", children: [_jsx(Box, { width: 3, children: _jsx(Text, { color: BLUE, children: icon }) }), _jsx(Box, { width: 14, children: _jsx(Text, { color: BRIGHT_BLUE, children: label }) }), _jsx(Text, { color: BLUE, children: ':  ' }), _jsx(Text, { color: BRIGHT_BLUE, children: value })] }));
export const Dashboard = () => {
    return (_jsxs(Box, { flexDirection: "column", width: 150, paddingX: 2, paddingTop: 1, children: [_jsxs(Box, { flexDirection: "row", justifyContent: "center", alignItems: "center", children: [_jsx(Box, { marginRight: 3, children: _jsx(Text, { color: BLUE, children: EKG_LEFT }) }), _jsx(Box, { flexDirection: "column", alignItems: "center", children: _jsx(DiagonalGradientArt, { lines: AEGIS_TITLE, bold: true }) }), _jsx(Box, { marginLeft: 3, children: _jsx(Text, { color: BLUE, children: EKG_RIGHT }) })] }), _jsx(Box, { justifyContent: "center", marginTop: 1, children: _jsx(Text, { color: BLUE, bold: true, children: '----  M E D I C A L   A I   A G E N T   S Y S T E M  ----' }) }), _jsx(Box, { justifyContent: "center", marginTop: 1, marginBottom: 1, children: _jsx(Box, { borderStyle: "single", borderColor: BLUE, paddingX: 3, children: _jsx(Text, { color: BRIGHT_BLUE, bold: true, children: 'Aegis Core Agent v0.1.0' }) }) }), _jsxs(Box, { flexDirection: "row", children: [_jsxs(Box, { flexDirection: "column", width: 60, marginRight: 3, children: [_jsx(Box, { flexDirection: "column", alignItems: "center", children: _jsx(DiagonalGradientArt, { lines: SHIELD_ART }) }), _jsxs(Box, { borderStyle: "single", borderColor: BLUE, flexDirection: "column", paddingX: 2, paddingY: 1, marginTop: 1, children: [_jsx(InfoRow, { icon: "@", label: "AGENT ID", value: "aegis-core-0001" }), _jsx(InfoRow, { icon: "^", label: "MODE", value: "ACTIVE" }), _jsx(InfoRow, { icon: "#", label: "MODEL", value: `${config.MODEL_NAME}:latest (ollama)` }), _jsx(InfoRow, { icon: "~", label: "STATUS", value: "ONLINE" })] })] }), _jsxs(Box, { flexDirection: "column", flexGrow: 1, children: [_jsxs(Box, { borderStyle: "single", borderColor: BLUE, flexDirection: "column", paddingX: 2, paddingY: 1, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { color: BRIGHT_BLUE, bold: true, children: 'AVAILABLE TOOLS' }) }), tools.map(([name, description]) => (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: BLUE, children: '> ' }), _jsx(Box, { width: 21, children: _jsx(Text, { color: BRIGHT_BLUE, children: name }) }), _jsx(Text, { color: BLUE, children: ':  ' }), _jsx(Box, { flexGrow: 1, children: _jsx(Text, { color: BRIGHT_BLUE, children: description }) }), _jsx(Text, { color: DIM_BLUE, children: '.  .  .' })] }, name)))] }), _jsxs(Box, { borderStyle: "single", borderColor: BLUE, flexDirection: "row", paddingX: 2, paddingY: 1, marginTop: 1, children: [_jsxs(Box, { flexDirection: "column", flexGrow: 1, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { color: BRIGHT_BLUE, bold: true, children: 'CAPABILITIES' }) }), capabilities.map(capability => (_jsx(Text, { color: BRIGHT_BLUE, children: `> ${capability}` }, capability)))] }), _jsx(Box, { flexDirection: "column", justifyContent: "flex-end", width: 42, children: _jsx(DiagonalGradientArt, { lines: MINI_EKG_SHIELD }) })] })] })] })] }));
};
