"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dashboard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ink_1 = require("ink");
const index_js_1 = require("../../aegis-core/src/config/index.js");
const art_js_1 = require("./art.js");
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
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: lines.map((line, row) => ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "row", children: [...line].map((char, column) => ((0, jsx_runtime_1.jsx)(ink_1.Text, { color: diagonalGradientColor(row, column, lines.length, width), bold: bold, children: char }, column))) }, row))) }));
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
const InfoRow = ({ icon, label, value }) => ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", children: [(0, jsx_runtime_1.jsx)(ink_1.Box, { width: 3, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BLUE, children: icon }) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { width: 14, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BRIGHT_BLUE, children: label }) }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BLUE, children: ':  ' }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BRIGHT_BLUE, children: value })] }));
const Dashboard = () => {
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", width: 150, paddingX: 2, paddingTop: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", justifyContent: "center", alignItems: "center", children: [(0, jsx_runtime_1.jsx)(ink_1.Box, { marginRight: 3, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BLUE, children: art_js_1.EKG_LEFT }) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", alignItems: "center", children: (0, jsx_runtime_1.jsx)(DiagonalGradientArt, { lines: art_js_1.AEGIS_TITLE, bold: true }) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginLeft: 3, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BLUE, children: art_js_1.EKG_RIGHT }) })] }), (0, jsx_runtime_1.jsx)(ink_1.Box, { justifyContent: "center", marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BLUE, bold: true, children: '----  M E D I C A L   A I   A G E N T   S Y S T E M  ----' }) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { justifyContent: "center", marginTop: 1, marginBottom: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Box, { borderStyle: "single", borderColor: BLUE, paddingX: 3, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BRIGHT_BLUE, bold: true, children: 'Aegis Core Agent v0.1.0' }) }) }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", width: 60, marginRight: 3, children: [(0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", alignItems: "center", children: (0, jsx_runtime_1.jsx)(DiagonalGradientArt, { lines: art_js_1.SHIELD_ART }) }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { borderStyle: "single", borderColor: BLUE, flexDirection: "column", paddingX: 2, paddingY: 1, marginTop: 1, children: [(0, jsx_runtime_1.jsx)(InfoRow, { icon: "@", label: "AGENT ID", value: "aegis-core-0001" }), (0, jsx_runtime_1.jsx)(InfoRow, { icon: "^", label: "MODE", value: "ACTIVE" }), (0, jsx_runtime_1.jsx)(InfoRow, { icon: "#", label: "MODEL", value: `${index_js_1.config.MODEL_NAME}:latest (ollama)` }), (0, jsx_runtime_1.jsx)(InfoRow, { icon: "~", label: "STATUS", value: "ONLINE" })] })] }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", flexGrow: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { borderStyle: "single", borderColor: BLUE, flexDirection: "column", paddingX: 2, paddingY: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Box, { marginBottom: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BRIGHT_BLUE, bold: true, children: 'AVAILABLE TOOLS' }) }), tools.map(([name, description]) => ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: BLUE, children: '> ' }), (0, jsx_runtime_1.jsx)(ink_1.Box, { width: 21, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BRIGHT_BLUE, children: name }) }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BLUE, children: ':  ' }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexGrow: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BRIGHT_BLUE, children: description }) }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: DIM_BLUE, children: '.  .  .' })] }, name)))] }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { borderStyle: "single", borderColor: BLUE, flexDirection: "row", paddingX: 2, paddingY: 1, marginTop: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", flexGrow: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Box, { marginBottom: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: BRIGHT_BLUE, bold: true, children: 'CAPABILITIES' }) }), capabilities.map(capability => ((0, jsx_runtime_1.jsx)(ink_1.Text, { color: BRIGHT_BLUE, children: `> ${capability}` }, capability)))] }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", justifyContent: "flex-end", width: 42, children: (0, jsx_runtime_1.jsx)(DiagonalGradientArt, { lines: art_js_1.MINI_EKG_SHIELD }) })] })] })] })] }));
};
exports.Dashboard = Dashboard;
