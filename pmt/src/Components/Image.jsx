import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton, Box, Typography } from '@mui/material';
import { imageProcessingService } from '../utils/imageProcessingService';

/**
 * I18n-aware image component with auto alt text generation
 */
const Image = ({ 
  src, 
  alt, 
  altKey,
  width, 
  height, 
  generateAlt = false, 
  processImage = false,
  className,
  style,
  ...props 
}) => {
  const { t, i18n } = useTranslation(['images']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generatedAlt, setGeneratedAlt] = useState('');
  const [processedSrc, setProcessedSrc] = useState(src);
  
  // Determine the alt text to use
  const displayAlt = alt || 
                     (altKey && t(`alt.${altKey}`, { ns: 'images' })) || 
                     generatedAlt || 
                     '';

  useEffect(() => {
    if (generateAlt && !alt && !altKey && !generatedAlt) {
      // Generate alt text for the image
      (async () => {
        try {
          const altText = await imageProcessingService.generateAltText(src);
          setGeneratedAlt(altText);
        } catch (err) {
          console.error('Failed to generate alt text:', err);
        }
      })();
    }
    
    if (processImage) {
      // Process the image using settings from translations
      (async () => {
        try {
          setLoading(true);
          const processed = await imageProcessingService.processImage(src);
          setProcessedSrc(processed);
        } catch (err) {
          console.error('Image processing failed:', err);
          setError(true);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setProcessedSrc(src);
    }
  }, [src, generateAlt, processImage, alt, altKey, i18n.language]);

  // Handle image load completion
  const handleLoad = () => {
    setLoading(false);
  };

  // Handle image load error
  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <Box position="relative" width={width} height={height} className={className} style={style}>
      {loading && (
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          animation="wave"
        />
      )}
      
      {error ? (
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="center"
          width="100%" 
          height="100%"
          bgcolor="action.disabledBackground"
          color="text.secondary"
          borderRadius={1}
        >
          <Typography variant="body2">
            {t('error', { ns: 'images', defaultValue: 'Image failed to load' })}
          </Typography>
        </Box>
      ) : (
        <img
          src={processedSrc}
          alt={displayAlt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            display: loading ? 'none' : 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...style
          }}
          {...props}
        />
      )}
    </Box>
  );
};

export default Image;
