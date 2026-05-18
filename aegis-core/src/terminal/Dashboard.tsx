import React from 'react';
import { Box, Text } from 'ink';
import { config } from '../config/index.js';
import { AEGIS_TITLE, EKG_LEFT, EKG_RIGHT, MINI_EKG_SHIELD, SHIELD_ART } from './art.js';

const BLUE = '#168dff';
const DIM_BLUE = '#0c03ffff';
const BRIGHT_BLUE = '#6bd5ff';
const BLUE_GRADIENT = ['#8feaff', '#53c7ff', '#168dff', '#0b63d1', '#063f91'];

const diagonalGradientColor = (row: number, column: number, rowCount: number, columnCount: number) => {
  if (rowCount <= 1 && columnCount <= 1) return BLUE;
  const rowRatio = rowCount <= 1 ? 0 : row / (rowCount - 1);
  const columnRatio = columnCount <= 1 ? 0 : column / (columnCount - 1);
  const diagonalRatio = (rowRatio + columnRatio) / 2;
  const colorIndex = Math.round(diagonalRatio * (BLUE_GRADIENT.length - 1));
  return BLUE_GRADIENT[colorIndex];
};

const DiagonalGradientArt = ({ lines, bold = false }: { lines: string[]; bold?: boolean }) => {
  const width = Math.max(...lines.map(line => line.length));

  return (
    <>
      {lines.map((line, row) => (
        <Box key={row} flexDirection="row">
          {[...line].map((char, column) => (
            <Text
              key={column}
              color={diagonalGradientColor(row, column, lines.length, width)}
              bold={bold}
            >
              {char}
            </Text>
          ))}
        </Box>
      ))}
    </>
  );
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
] as const;

const capabilities = [
  'Natural language understanding',
  'Tool orchestration & execution',
  'Context aware reasoning',
  'Persistent memory',
  'Safe command execution',
  'Extensible plugin system',
  'Future multi-agent support',
];

const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <Box flexDirection="row">
    <Box width={3}><Text color={BLUE}>{icon}</Text></Box>
    <Box width={14}><Text color={BRIGHT_BLUE}>{label}</Text></Box>
    <Text color={BLUE}>{':  '}</Text>
    <Text color={BRIGHT_BLUE}>{value}</Text>
  </Box>
);

export const Dashboard = () => {
  return (
    <Box flexDirection="column" width={150} paddingX={2} paddingTop={1}>
      <Box flexDirection="row" justifyContent="center" alignItems="center">
        <Box marginRight={3}><Text color={BLUE}>{EKG_LEFT}</Text></Box>
        <Box flexDirection="column" alignItems="center">
          <DiagonalGradientArt lines={AEGIS_TITLE} bold />
        </Box>
        <Box marginLeft={3}><Text color={BLUE}>{EKG_RIGHT}</Text></Box>
      </Box>

      <Box justifyContent="center" marginTop={1}>
        <Text color={BLUE} bold>{'----  M E D I C A L   A I   A G E N T   S Y S T E M  ----'}</Text>
      </Box>

      <Box justifyContent="center" marginTop={1} marginBottom={1}>
        <Box borderStyle="single" borderColor={BLUE} paddingX={3}>
          <Text color={BRIGHT_BLUE} bold>{'Aegis Core Agent v0.1.0'}</Text>
        </Box>
      </Box>

      <Box flexDirection="row">
        <Box flexDirection="column" width={60} marginRight={3}>
          <Box flexDirection="column" alignItems="center">
            <DiagonalGradientArt lines={SHIELD_ART} />
          </Box>

          <Box borderStyle="single" borderColor={BLUE} flexDirection="column" paddingX={2} paddingY={1} marginTop={1}>
            <InfoRow icon="@" label="AGENT ID" value="aegis-core-0001" />
            <InfoRow icon="^" label="MODE" value="ACTIVE" />
            <InfoRow icon="#" label="MODEL" value={`${config.MODEL_NAME}:latest (ollama)`} />
            <InfoRow icon="~" label="STATUS" value="ONLINE" />
          </Box>
        </Box>

        <Box flexDirection="column" flexGrow={1}>
          <Box borderStyle="single" borderColor={BLUE} flexDirection="column" paddingX={2} paddingY={1}>
            <Box marginBottom={1}><Text color={BRIGHT_BLUE} bold>{'AVAILABLE TOOLS'}</Text></Box>
            {tools.map(([name, description]) => (
              <Box key={name} flexDirection="row">
                <Text color={BLUE}>{'> '}</Text>
                <Box width={21}><Text color={BRIGHT_BLUE}>{name}</Text></Box>
                <Text color={BLUE}>{':  '}</Text>
                <Box flexGrow={1}><Text color={BRIGHT_BLUE}>{description}</Text></Box>
                <Text color={DIM_BLUE}>{'.  .  .'}</Text>
              </Box>
            ))}
          </Box>

          <Box borderStyle="single" borderColor={BLUE} flexDirection="row" paddingX={2} paddingY={1} marginTop={1}>
            <Box flexDirection="column" flexGrow={1}>
              <Box marginBottom={1}><Text color={BRIGHT_BLUE} bold>{'CAPABILITIES'}</Text></Box>
              {capabilities.map(capability => (
                <Text key={capability} color={BRIGHT_BLUE}>{`> ${capability}`}</Text>
              ))}
            </Box>
            <Box flexDirection="column" justifyContent="flex-end" width={42}>
              <DiagonalGradientArt lines={MINI_EKG_SHIELD} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
