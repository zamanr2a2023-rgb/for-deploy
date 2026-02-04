<!-- @format -->

# Location Data - Bangladesh Coordinates

## Overview

The system now includes dummy location data for all technicians and customers using real Bangladesh (Dhaka) coordinates.

## 📍 Technician Locations

### 1. John Technician (TECH_INTERNAL)

- **Phone:** 4444444444
- **Location:** Mohakhali C/A, Dhaka
- **Coordinates:** 23.8103, 90.4125
- **Status:** ONLINE
- **Address:** 456 Mohakhali C/A, Dhaka-1212, Bangladesh
- **Specialization:** AC Repair, HVAC

### 2. Mike Freelancer (TECH_FREELANCER)

- **Phone:** 5555555555
- **Location:** Dhanmondi, Dhaka
- **Coordinates:** 23.7465, 90.3763
- **Status:** ONLINE
- **Address:** 789 Dhanmondi Road 27, Dhaka-1209, Bangladesh
- **Specialization:** Electrical, Plumbing
- **Commission Rate:** 40%

### 3. David Electrician (TECH_FREELANCER)

- **Phone:** 6666666666
- **Location:** Uttara, Dhaka
- **Coordinates:** 23.8594, 90.3963
- **Status:** ONLINE
- **Address:** 321 Uttara Sector 7, Dhaka-1230, Bangladesh
- **Specialization:** Electrical, AC Repair
- **Commission Rate:** 35%

---

## 👥 Customer Locations

### 1. Jane Customer

- **Phone:** 9999999999
- **Location:** Gulshan, Dhaka
- **Coordinates:** 23.7808, 90.4106
- **Address:** 123 Gulshan Avenue, Dhaka-1212, Bangladesh

### 2. Robert Smith (Blocked)

- **Phone:** 8888888888
- **Location:** Mirpur, Dhaka
- **Coordinates:** 23.7265, 90.3854
- **Address:** 789 Mirpur Road, Dhaka-1216, Bangladesh
- **Status:** Blocked (Multiple customer complaints)

### 3. Sarah Johnson

- **Phone:** 7777777777
- **Location:** Banani, Dhaka
- **Coordinates:** 23.7515, 90.3996
- **Address:** 456 Banani Road 11, Dhaka-1213, Bangladesh

---

## 🗺️ Coverage Map

```
Dhaka Areas Covered:
├── Mohakhali (23.8103, 90.4125) - John Technician ⚙️
├── Dhanmondi (23.7465, 90.3763) - Mike Freelancer ⚙️
├── Uttara (23.8594, 90.3963) - David Electrician ⚙️
├── Gulshan (23.7808, 90.4106) - Jane Customer 👤
├── Mirpur (23.7265, 90.3854) - Robert Smith 👤
└── Banani (23.7515, 90.3996) - Sarah Johnson 👤
```

---

## 🧪 Testing Location Features

### Test Nearby Technicians

```bash
POST {{baseUrl}}/api/location/nearby
Authorization: Bearer {{dispatcherToken}}

{
  "latitude": 23.7808,
  "longitude": 90.4106,
  "radius": 10
}
```

**Expected:** Returns all 3 technicians with distances from Gulshan area

### Test Update Technician Location

```bash
POST {{baseUrl}}/api/location/update
Authorization: Bearer {{technicianToken}}

{
  "latitude": 23.7500,
  "longitude": 90.4000,
  "status": "ONLINE"
}
```

### Test Get Technician Location

```bash
GET {{baseUrl}}/api/location/technician/:id
Authorization: Bearer {{adminToken}}
```

### Test Calculate ETA

```bash
GET {{baseUrl}}/api/location/eta?techId=4&customerLat=23.7808&customerLng=90.4106
Authorization: Bearer {{dispatcherToken}}
```

---

## 📊 Distance Matrix (Approximate)

| From → To     | Mohakhali | Dhanmondi | Uttara | Gulshan | Mirpur | Banani |
| ------------- | --------- | --------- | ------ | ------- | ------ | ------ |
| **Mohakhali** | 0 km      | 7 km      | 6 km   | 3 km    | 10 km  | 4 km   |
| **Dhanmondi** | 7 km      | 0 km      | 12 km  | 5 km    | 4 km   | 3 km   |
| **Uttara**    | 6 km      | 12 km     | 0 km   | 8 km    | 13 km  | 10 km  |
| **Gulshan**   | 3 km      | 5 km      | 8 km   | 0 km    | 7 km   | 2 km   |
| **Mirpur**    | 10 km     | 4 km      | 13 km  | 7 km    | 0 km   | 5 km   |
| **Banani**    | 4 km      | 3 km      | 10 km  | 2 km    | 5 km   | 0 km   |

---

## 🎯 Use Cases

### 1. Find Nearest Technician for Customer

- Customer in **Gulshan** (23.7808, 90.4106)
- Nearest: **John Technician** in Mohakhali (~3 km)
- Alternative: **Mike Freelancer** in Dhanmondi (~5 km)

### 2. Dispatch Optimization

- Service request from **Banani** area
- Optimal assignment: **John Technician** (4 km) or **Mike Freelancer** (3 km)
- **David Electrician** in Uttara would be ~10 km away

### 3. ETA Calculation

- Average Dhaka traffic speed: 30 km/h
- 3 km distance ≈ 6 minutes
- 5 km distance ≈ 10 minutes
- 10 km distance ≈ 20 minutes

---

## 🔧 Database Schema Fields

### User Table Location Fields

```prisma
model User {
  // Customer location (home/business)
  latitude          Float?
  longitude         Float?
  homeAddress       String?

  // Technician real-time location
  lastLatitude      Float?
  lastLongitude     Float?
  locationStatus    String?     // ONLINE, BUSY, OFFLINE
  locationUpdatedAt DateTime?
}
```

### Service Request Location Fields

```prisma
model ServiceRequest {
  address       String
  streetAddress String?
  city          String?
  landmark      String?
  latitude      Float?
  longitude     Float?
}
```

---

## 📝 Notes

- All coordinates are real Bangladesh (Dhaka) locations
- Locations updated automatically when technicians use location update API
- Distance calculations use Haversine formula
- ETA calculations assume 30 km/h average speed in Dhaka traffic
- Location data persists in database
- Can be queried via location APIs

---

## 🚀 Next Steps

1. Test nearby technician queries
2. Test ETA calculations
3. Verify distance sorting works correctly
4. Test location updates from mobile apps
5. Add more technicians in different areas if needed

---

**Last Updated:** December 14, 2025  
**Status:** ✅ Production Ready with Bangladesh Coordinates
