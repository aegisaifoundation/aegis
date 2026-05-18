import React from 'react';
import { Box, Text } from 'ink';
import { config } from '../config/index.js';
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
    return (React.createElement(React.Fragment, null, lines.map((line, row) => (React.createElement(Box, { key: row, flexDirection: "row" }, [...line].map((char, column) => (React.createElement(Text, { key: column, color: diagonalGradientColor(row, column, lines.length, width), bold: bold }, char))))))));
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
const InfoRow = ({ icon, label, value }) => (React.createElement(Box, { flexDirection: "row" },
    React.createElement(Box, { width: 3 },
        React.createElement(Text, { color: BLUE }, icon)),
    React.createElement(Box, { width: 14 },
        React.createElement(Text, { color: BRIGHT_BLUE }, label)),
    React.createElement(Text, { color: BLUE }, ':  '),
    React.createElement(Text, { color: BRIGHT_BLUE }, value)));
export const Dashboard = () => {
    return (React.createElement(Box, { flexDirection: "column", width: 150, paddingX: 2, paddingTop: 1 },
        React.createElement(Box, { flexDirection: "row", justifyContent: "center", alignItems: "center" },
            React.createElement(Box, { marginRight: 3 },
                React.createElement(Text, { color: BLUE }, EKG_LEFT)),
            React.createElement(Box, { flexDirection: "column", alignItems: "center" },
                React.createElement(DiagonalGradientArt, { lines: AEGIS_TITLE, bold: true })),
            React.createElement(Box, { marginLeft: 3 },
                React.createElement(Text, { color: BLUE }, EKG_RIGHT))),
        React.createElement(Box, { justifyContent: "center", marginTop: 1 },
            React.createElement(Text, { color: BLUE, bold: true }, '----  M E D I C A L   A I   A G E N T   S Y S T E M  ----')),
        React.createElement(Box, { justifyContent: "center", marginTop: 1, marginBottom: 1 },
            React.createElement(Box, { borderStyle: "single", borderColor: BLUE, paddingX: 3 },
                React.createElement(Text, { color: BRIGHT_BLUE, bold: true }, 'Aegis Core Agent v0.1.0'))),
        React.createElement(Box, { flexDirection: "row" },
            React.createElement(Box, { flexDirection: "column", width: 60, marginRight: 3 },
                React.createElement(Box, { flexDirection: "column", alignItems: "center" },
                    React.createElement(DiagonalGradientArt, { lines: SHIELD_ART })),
                React.createElement(Box, { borderStyle: "single", borderColor: BLUE, flexDirection: "column", paddingX: 2, paddingY: 1, marginTop: 1 },
                    React.createElement(InfoRow, { icon: "@", label: "AGENT ID", value: "aegis-core-0001" }),
                    React.createElement(InfoRow, { icon: "^", label: "MODE", value: "ACTIVE" }),
                    React.createElement(InfoRow, { icon: "#", label: "MODEL", value: `${config.MODEL_NAME}:latest (ollama)` }),
                    React.createElement(InfoRow, { icon: "~", label: "STATUS", value: "ONLINE" }))),
            React.createElement(Box, { flexDirection: "column", flexGrow: 1 },
                React.createElement(Box, { borderStyle: "single", borderColor: BLUE, flexDirection: "column", paddingX: 2, paddingY: 1 },
                    React.createElement(Box, { marginBottom: 1 },
                        React.createElement(Text, { color: BRIGHT_BLUE, bold: true }, 'AVAILABLE TOOLS')),
                    tools.map(([name, description]) => (React.createElement(Box, { key: name, flexDirection: "row" },
                        React.createElement(Text, { color: BLUE }, '> '),
                        React.createElement(Box, { width: 21 },
                            React.createElement(Text, { color: BRIGHT_BLUE }, name)),
                        React.createElement(Text, { color: BLUE }, ':  '),
                        React.createElement(Box, { flexGrow: 1 },
                            React.createElement(Text, { color: BRIGHT_BLUE }, description)),
                        React.createElement(Text, { color: DIM_BLUE }, '.  .  .'))))),
                React.createElement(Box, { borderStyle: "single", borderColor: BLUE, flexDirection: "row", paddingX: 2, paddingY: 1, marginTop: 1 },
                    React.createElement(Box, { flexDirection: "column", flexGrow: 1 },
                        React.createElement(Box, { marginBottom: 1 },
                            React.createElement(Text, { color: BRIGHT_BLUE, bold: true }, 'CAPABILITIES')),
                        capabilities.map(capability => (React.createElement(Text, { key: capability, color: BRIGHT_BLUE }, `> ${capability}`)))),
                    React.createElement(Box, { flexDirection: "column", justifyContent: "flex-end", width: 42 },
                        React.createElement(DiagonalGradientArt, { lines: MINI_EKG_SHIELD })))))));
};
