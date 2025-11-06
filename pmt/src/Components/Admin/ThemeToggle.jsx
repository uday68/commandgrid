import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { FiSun, FiMoon } from 'react-icons/fi';

const ThemeToggle = ({ theme = 'light', onChange }) => {
  return (
    <Tooltip title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton onClick={onChange} color="inherit" aria-label="toggle theme" size="small">
        {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;