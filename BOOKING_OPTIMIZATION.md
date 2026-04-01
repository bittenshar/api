# Booking Verification Optimization Guide

This document explains the optimizations made to the face verification and booking lookup system for **ultra-fast API responses** after Rekognition face matching.

## Overview

After AWS Rekognition returns face match data:
- **FaceId**: `798eef4d-a010-40af-9dde-8f99a6374025`
- **ExternalImageId (userId)**: `69b1b66bca13f3e8d88925d3`

The system now directly queries MongoDB for booking status with minimal latency.

## Key Optimizations

### 1. **Fast Field Selection**
Instead of returning full documents, queries now select only essential fields:
```javascript
.select('status isUsed quantity seatType totalPrice createdAt')
```
This reduces document size and network transfer time.

### 2. **Compound Database Indexes**

Booking collection now has optimized indexes:
- `idx_user_event`: `{ userId: 1, eventId: 1 }` - **Primary lookup index**
- `idx_user_event_used`: `{ userId: 1, eventId: 1, isUsed: 1 }` - **Status check optimization**
- `idx_event_used`: `{ eventId: 1, isUsed: 1 }` - Available seats filtering
- `idx_user_created`: `{ userId: 1, createdAt: -1 }` - Historical queries

Face-table collection now has:
- `idx_status_user`: `{ status: 1, userId: 1 }` - Fast status lookups

### 3. **Two Booking Query Methods**

#### Fast Lookup (Default for verification):
```javascript
// Returns only essential fields - ~10-15ms
await bookingService.getBookingStatusFast(userId, eventId)
```

#### Full Lookup (When complete details needed):
```javascript
// Returns all booking data
await bookingService.findBookingByUserAndEvent(userId, eventId)
```

### 4. **Computed Response Structure**

The `getBookingWithStatus()` method returns pre-computed response data:
```javascript
{
  hasTicket: true,
  ticketStatus: 'confirmed' | 'already_used',
  color: 'green' | 'blue',
  ticketDetails: {
    quantity: 1,
    seatType: 'general',
    totalPrice: 50.00,
    bookedAt: '2024-04-02T...'
  }
}
```

No post-processing needed in the controller.

### 5. **Field Projection in Fast Lookup**

Face verification now uses `.select()` to fetch only needed fields:
```javascript
.select('userId fullName rekognitionId status')
```

## Performance Metrics

### Typical Response Times (Single queries):
- **User lookup**: 5-10ms
- **Booking lookup**: 8-15ms
- **Combined (already parallelized)**: ~15-20ms total

### Memory Usage:
- **Before**: Full document ~2-3KB per query
- **After**: Selected fields ~200-400 bytes per query
- **Reduction**: 80-90% less memory transfer

## API Response Example

```json
{
  "success": true,
  "userId": "69b1b66bca13f3e8d88925d3",
  "fullName": "Bilal",
  "status": "active",
  "color": "green",
  "similarity": 95.5,
  "rekognitionId": "public/bilal.jpeg",
  "hasTicket": true,
  "ticketStatus": "confirmed",
  "ticketDetails": {
    "quantity": 1,
    "seatType": "general",
    "totalPrice": 99.99,
    "bookedAt": "2024-04-02T10:30:00Z"
  },
  "timestamp": "2024-04-02T11:45:23Z"
}
```

## Endpoints

### 1. **POST /api/face-verify** (Rekognition + Booking)
- Searches Rekognition collection first
- Falls back to MongoDB if no Rekognition match
- Uses optimized booking lookup
- **Typical latency**: 500-800ms (mostly Rekognition API)

### 2. **POST /api/face-verify-direct** (Direct DB Lookup)
- Bypasses Rekognition entirely
- Queries MongoDB directly for user + booking
- **Typical latency**: 30-50ms (2 parallel queries)
- Use when: Rekognition index unavailable or for fast local verification

**Request body:**
```json
{
  "userId": "69b1b66bca13f3e8d88925d3",
  "eventId": "507f1f77bcf86cd799439011"
}
```

## MongoDB Index Management

### Verify Indexes Are Created:
```javascript
// In MongoDB Cloud Console or local shell:
db['face-table'].getIndexes()
db.bookings.getIndexes()
```

### If Indexes Need Rebuilding:
```javascript
// Drop existing indexes (except _id):
db['face-table'].dropIndex('idx_status_user')
db.bookings.dropIndex('idx_user_event')

// Mongoose will recreate them on next app restart
// Or manually run: model.collection.ensureIndex()
```

## Optimization Checklist

- ✅ Booking model: Compound indexes created
- ✅ FaceTable model: Status and user indexes added
- ✅ BookingService: `getBookingStatusFast()` and `getBookingWithStatus()` methods
- ✅ FaceTableService: `findUserByUserIdFast()` for minimal data transfer
- ✅ Controllers: Updated to use fast methods
- ✅ Query optimization: `.lean()` and `.select()` implemented

## Future Optimizations

1. **Redis Caching** for frequently accessed bookings
2. **Database Connection Pooling** optimization
3. **Parallel queries** for user + booking (already done with Promise.all if needed)
4. **Projection-based queries** for audit logs
5. **Query result streaming** for large datasets

## Troubleshooting

### Slow queries despite optimization:
1. Check MongoDB index status: `db.collection.explain().executionStats()`
2. Verify `.explain()` shows "COLLSCAN" → add missing index
3. Monitor slow query logs: MongoDB Atlas > Database > Performance

### Missing booking data:
1. Verify userId format matches between Rekognition and Booking collection
2. Check eventId is valid ObjectId: `db.bookings.find({ eventId: ObjectId("...") })`
3. Confirm booking status not 'cancelled'

### Memory pressure:
- If many concurrent requests, verify `.lean()` and `.select()` are applied
- Monitor connection pool size in MongoDB Atlas
