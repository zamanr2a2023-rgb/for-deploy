// src/utils/location.js
// Location utility functions for geocoding and distance calculations

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude  
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Simple in-memory cache for location names
const locationCache = new Map();

/**
 * Get location name from coordinates using OpenStreetMap Nominatim (Free)
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string>} Location name
 */
export const getLocationNameOSM = async (latitude, longitude) => {
  // Create cache key with rounded coordinates (to avoid cache miss for tiny differences)
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  
  // Check cache first
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey);
  }
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FSM-System/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`OSM request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.display_name) {
      // Extract meaningful location parts
      const address = data.address || {};
      const parts = [];
      
      if (address.road || address.house_number) {
        const roadPart = [address.house_number, address.road].filter(Boolean).join(' ');
        if (roadPart) parts.push(roadPart);
      }
      
      if (address.neighbourhood || address.suburb || address.quarter) {
        parts.push(address.neighbourhood || address.suburb || address.quarter);
      }
      
      if (address.city || address.town || address.village || address.municipality) {
        parts.push(address.city || address.town || address.village || address.municipality);
      }
      
      if (address.state || address.province) {
        parts.push(address.state || address.province);
      }
      
      if (address.country) {
        parts.push(address.country);
      }
      
      const result = parts.length > 0 ? parts.join(', ') : data.display_name;
      
      // Cache the result for future use
      locationCache.set(cacheKey, result);
      
      return result;
    }
    
    const notFoundResult = 'Location Not Found';
    locationCache.set(cacheKey, notFoundResult);
    return notFoundResult;
  } catch (error) {
    const errorResult = 'Geocoding Service Error';
    locationCache.set(cacheKey, errorResult);
    return errorResult;
  }
};

/**
 * Get location name using Google Geocoding API (Paid but more accurate)
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string>} Location name
 */
export const getLocationNameGoogle = async (latitude, longitude) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error('Google Geocoding request failed');
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    
    return 'Unknown Location';
  } catch (error) {
    return 'Location Unknown';
  }
};

/**
 * Smart location name getter - tries Google first, falls back to OSM
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string>} Location name
 */
export const getLocationName = async (latitude, longitude) => {
  // Validate coordinates first
  if (!validateCoordinates(latitude, longitude)) {
    return 'Invalid Coordinates';
  }
  
  // Try Google if API key is available and valid (not placeholder)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey && !apiKey.includes('your-google-maps-api-key') && !apiKey.includes('YourRealApiKeyHere')) {
    try {
      const googleResult = await getLocationNameGoogle(latitude, longitude);
      if (googleResult && googleResult !== 'Location Unknown' && googleResult !== 'Unknown Location') {
        return googleResult;
      }
    } catch (error) {
      // Fall back to OSM if Google fails
    }
  }
  
  // Fallback to free OSM service
  try {
    const osmResult = await getLocationNameOSM(latitude, longitude);
    return osmResult;
  } catch (error) {
    return 'Location Service Unavailable';
  }
};

/**
 * Calculate estimated travel time based on distance
 * @param {number} distance - Distance in kilometers
 * @param {string} mode - Transport mode: 'driving', 'walking', 'cycling'
 * @returns {string} Estimated time string
 */
export const calculateEstimatedTime = (distance, mode = 'driving') => {
  let speedKmh;
  
  switch (mode) {
    case 'walking':
      speedKmh = 5; // 5 km/h average walking speed
      break;
    case 'cycling':
      speedKmh = 15; // 15 km/h average cycling speed
      break;
    case 'driving':
    default:
      speedKmh = 30; // 30 km/h average city driving (including traffic)
      break;
  }
  
  const timeInHours = distance / speedKmh;
  const timeInMinutes = Math.ceil(timeInHours * 60);
  
  if (timeInMinutes < 60) {
    return `${timeInMinutes} min`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

/**
 * Validate latitude and longitude
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {boolean} Whether coordinates are valid
 */
export const validateCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

/**
 * Validate coordinates for Bangladesh region specifically
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {boolean} Whether coordinates are valid for Bangladesh
 */
export const validateBangladeshCoordinates = (latitude, longitude) => {
  return (
    validateCoordinates(latitude, longitude) &&
    latitude >= 20.5 && latitude <= 26.5 &&  // Bangladesh latitude range
    longitude >= 88.0 && longitude <= 93.0   // Bangladesh longitude range
  );
};

/**
 * Format coordinates for display
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {string} Formatted coordinates
 */
export const formatCoordinates = (latitude, longitude) => {
  if (!validateCoordinates(latitude, longitude)) {
    return 'Invalid coordinates';
  }
  
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  
  return `${Math.abs(latitude).toFixed(6)}°${latDir}, ${Math.abs(longitude).toFixed(6)}°${lonDir}`;
};