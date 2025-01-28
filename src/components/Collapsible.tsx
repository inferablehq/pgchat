import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useFocus, useApp } from 'ink';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  collapsed?: boolean;
  isSelected?: boolean;
  onSelect?: () => void
}

export const Collapsible = ({ title, children, collapsed = false, onSelect, isSelected}: CollapsibleProps) => {
  useInput((_, key) => {
    if (isSelected && key.return) {
      onSelect?.();
    }
  }, { isActive: isSelected });

  if (collapsed) {
    return (
      <Text>
        <Text color={isSelected ? "yellow" : "cyan"}>{isSelected ? "▶ " : "▸ "}</Text>
        <Text color={isSelected ? "yellow" : "white"}>{title}</Text>
      </Text>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={isSelected ? "yellow" : "cyan"}>
      <Box justifyContent="space-between">
        <Text color={isSelected ? "yellow" : "cyan"} bold>{title}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
};
