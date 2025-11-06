/**
 * Utility functions to detect user's region/location
 */

/**
 * Detect user's region based on various methods
 * @returns {Promise<string>} The region/country code (e.g., 'IN', 'US')
 */
export async function detectUserRegion() {
  // Try different methods in order of preference
  try {
    // Method 1: Try using the Geolocation API with a geocoding service
    const geoLocation = await getGeolocationPosition();
    if (geoLocation) {
      const { latitude, longitude } = geoLocation.coords;
      const regionFromGeo = await reverseGeocode(latitude, longitude);
      if (regionFromGeo) return regionFromGeo;
    }
  } catch (error) {
    console.warn('Geolocation detection failed:', error);
  }

  // Method 2: Use navigator.language as a fallback
  try {
    const browserLocale = navigator.language || navigator.userLanguage;
    if (browserLocale) {
      // Extract country code from locale like 'en-US' -> 'US'
      const countryCode = browserLocale.split('-')[1];
      if (countryCode && countryCode.length === 2) {
        return countryCode.toUpperCase();
      }
    }
  } catch (error) {
    console.warn('Browser locale detection failed:', error);
  }

  // Method 3: Use IP-based geolocation API as last resort
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      return data.country_code;
    }
  } catch (error) {
    console.warn('IP geolocation failed:', error);
  }

  // Default to Indian region if all methods fail
  return 'IN';
}

/**
 * Get user's position using the browser's Geolocation API
 * @returns {Promise<GeolocationPosition>}
 */
function getGeolocationPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  });
}

/**
 * Convert latitude/longitude to a region/country code using a geocoding service
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string|null>} Country code
 */
async function reverseGeocode(latitude, longitude) {
  try {
    // Using OpenStreetMap Nominatim service (free, requires proper attribution on your site)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en', // Request English results
          'User-Agent': 'ProjectManagementTool/1.0' // Please replace with your app name
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      // Return the country code
      return data.address?.country_code?.toUpperCase() || null;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

/**
 * Check if the user is in India
 * @returns {Promise<boolean>}
 */
export async function isInIndia() {
  try {
    const region = await detectUserRegion();
    return region === 'IN';
  } catch {
    // Default to false if detection fails
    return false;
  }
}
