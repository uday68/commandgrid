/**
 * Centralized exports for styled components to avoid import issues
 * 
 * This file helps prevent the "styled_default is not a function" error
 * by ensuring all components use the same styled import
 */

import { styled } from '@mui/material/styles';

// Re-export styled from MUI properly
export { styled };

// Add any common styled component utilities here
export const createStyledComponent = (Component, styles) => {
  return styled(Component)(styles);
};
