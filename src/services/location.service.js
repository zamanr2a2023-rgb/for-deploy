// src/services/location.service.js
import { prisma } from '../prisma.js';
import { 
  calculateDistance, 
  getLocationName, 
  calculateEstimatedTime,
  validateCoordinates 
} from '../utils/location.js';

// ✅ Update technician location with validation and location name
export const updateLocation = async (req, res, next) => {
  try {
    const technicianId = req.user.id;
    const { latitude, longitude, status } = req.body;

    // Validate coordinates
    const lat = Number(latitude);
    const lng = Number(longitude); 
    
    if (!validateCoordinates(lat, lng)) {
      return res.status(400).json({ message: 'Invalid coordinates provided' });
    }

    // Get location name
    let locationName = 'Unknown Location';
    try { 
      locationName = await getLocationName(lat, lng);
    } catch (error) {
      console.error('Error getting location name:', error);
    }

    // Update user location
    const user = await prisma.user.update({
      where: { id: technicianId },
      data: {
        lastLatitude: lat,
        lastLongitude: lng,
        locationStatus: status || 'ONLINE',
        locationUpdatedAt: new Date(),
      },
    });

    // Real-time broadcast removed - location updates stored in database only
    console.log(`📍 Location updated for technician ${user.id}: ${locationName}`);

    return res.json({
      message: 'Location updated successfully',
      location: {
        latitude: user.lastLatitude,
        longitude: user.lastLongitude,
        status: user.locationStatus,
        locationName,
        coordinates: `${lat}, ${lng}`,
        updatedAt: user.locationUpdatedAt
      },
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Get nearby technicians with location names and distances
export const getNearbyTechnicians = async (req, res, next) => {
  try {
    const { latitude, longitude, radius, includeLocationName } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Validate coordinates
    const queryLat = Number(latitude);
    const queryLng = Number(longitude);
    
    if (!validateCoordinates(queryLat, queryLng)) {
      return res.status(400).json({ message: 'Invalid coordinates provided' });
    }

    // Get all available technicians
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ['TECH_INTERNAL', 'TECH_FREELANCER'] },
        isBlocked: false,
        lastLatitude: { not: null },
        lastLongitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        lastLatitude: true,
        lastLongitude: true,
        locationStatus: true,
        locationUpdatedAt: true,
        technicianProfile: {
          select: {
            type: true,
            status: true,
            commissionRate: true
          }
        },
      },
    });

    // Calculate distances and enhance data
    const enhancedTechnicians = await Promise.all(
      technicians.map(async (tech) => {
        const distance = calculateDistance(
          queryLat,
          queryLng,
          tech.lastLatitude,
          tech.lastLongitude
        );

        // Skip if outside radius
        if (radius && distance > Number(radius)) {
          return null;
        }

        let locationName = null;
        
        // Get location name if requested
        if (includeLocationName === 'true') {
          try {
            locationName = await getLocationName(tech.lastLatitude, tech.lastLongitude);
          } catch (error) {
            console.error(`Error getting location for technician ${tech.id}:`, error);
            locationName = 'Location unavailable';
          }
        }

        return {
          ...tech,
          distance,
          locationName,
          estimatedArrival: calculateEstimatedTime(distance, 'driving'),
          coordinates: `${tech.lastLatitude}, ${tech.lastLongitude}`,
          lastSeen: tech.locationUpdatedAt,
          availability: tech.locationStatus || 'OFFLINE'
        };
      })
    );

    // Filter out null values (outside radius) and sort by distance
    const filtered = enhancedTechnicians
      .filter(tech => tech !== null)
      .sort((a, b) => a.distance - b.distance);

    return res.json({
      count: filtered.length,
      searchRadius: radius ? Number(radius) : null,
      searchLocation: {
        latitude: queryLat,
        longitude: queryLng
      },
      technicians: filtered
    });
  } catch (err) {
    next(err);
  }

  return filtered;
};

// ✅ Get technician location history
export const getLocationHistory = async (req, res, next) => {
  try {
    const { technicianId, startDate, endDate, limit = 100 } = req.query;
    
    if (!technicianId) {
      return res.status(400).json({ message: 'Technician ID is required' });
    }

    const where = {
      technicianId: Number(technicianId)
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get check-in history (from work orders)
    const checkins = await prisma.technicianCheckin.findMany({
      where,
      include: {
        workOrder: {
          select: {
            id: true,
            woNumber: true,
            address: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    // Enhance with location names if needed
    const enhancedHistory = await Promise.all(
      checkins.map(async (checkin) => {
        let locationName = 'Unknown Location';
        try {
          locationName = await getLocationName(checkin.latitude, checkin.longitude);
        } catch (error) {
          console.error('Error getting location name for history:', error);
        }

        return {
          ...checkin,
          locationName,
          coordinates: `${checkin.latitude}, ${checkin.longitude}`
        };
      })
    );

    return res.json({
      count: enhancedHistory.length,
      history: enhancedHistory
    });
  } catch (err) {
    next(err);
  }
};
