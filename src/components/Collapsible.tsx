import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useFocus, useApp } from 'ink';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  collapsed?: boolean;
}

export const Collapsible = ({ title, children, collapsed}: CollapsibleProps) => {

  if (collapsed) {
    return (
      <Text>
        <Text color="cyan">▸ </Text>
        <Text color={'white'}>{title}</Text>
      </Text>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan">
      <Box justifyContent="space-between">
        <Text color="cyan" bold>{title}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
};
