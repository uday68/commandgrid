import React from 'react';
import { Typography, Link, Box, Container } from '@mui/material';

const AdminFooter = ({ theme = 'light' }) => {
  const currentYear = new Date().getFullYear();
  
  const themeClasses = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-600',
      border: 'border-gray-200'
    },
    dark: {
      bg: 'bg-gray-800',
      text: 'text-gray-300',
      border: 'border-gray-700'
    }
  }[theme];
  
  return (
    <Box component="footer" className={`py-4 mt-8 border-t ${themeClasses.border} ${themeClasses.bg}`}>
      <Container maxWidth="lg">
        <Box className="flex flex-col md:flex-row justify-between items-center">
          <Typography variant="body2" className={themeClasses.text}>
            &copy; {currentYear} Project Management Tool. All rights reserved.
          </Typography>
          
          <Box className="flex space-x-4 mt-2 md:mt-0">
            <Link href="#" className={themeClasses.text} underline="hover">Privacy Policy</Link>
            <Link href="#" className={themeClasses.text} underline="hover">Terms of Service</Link>
            <Link href="#" className={themeClasses.text} underline="hover">Support</Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminFooter;