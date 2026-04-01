# Quick Test Guide - Booking Verification

After Rekognition returns face data, test the fast booking verification endpoints.

## Test Data Setup

Make sure you have test data in MongoDB:

```javascript
// Test user in face-table
{
  "_id": ObjectId("..."),
  "userId": "69b1b66bca13f3e8d88925d3",
  "fullName": "Bilal",
  "rekognitionId": "public/bilal.jpeg",
  "status": "active",
  "createdAt": new Date()
}

// Test booking
{
  "_id": ObjectId("..."),
  "userId": "69b1b66bca13f3e8d88925d3",
  "eventId": ObjectId("507f1f77bcf86cd799439011"),
  "fullName": "Bilal",
  "status": "confirmed",
  "quantity": 1,
  "seatType": "general",
  "totalPrice": 99.99,
  "isUsed": false,
  "createdAt": new Date()
}
```

## Test 1: Direct Booking Verification (Fastest)

**Endpoint:** `POST /api/face-verify-direct`

This directly checks the booking without Rekognition.

### Using cURL:
```bash
curl -X POST http://localhost:3000/api/face-verify-direct \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69b1b66bca13f3e8d88925d3",
    "eventId": "507f1f77bcf86cd799439011"
  }'
```

### Using Node.js:
```javascript
const response = await fetch('http://localhost:3000/api/face-verify-direct', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '69b1b66bca13f3e8d88925d3',
    eventId: '507f1f77bcf86cd799439011'
  })
});

const data = await response.json();
console.log('Response time should be ~30-50ms');
console.log(data);
```

### Expected Response (30-50ms):
```json
{
  "success": true,
  "userId": "69b1b66bca13f3e8d88925d3",
  "fullName": "Bilal",
  "status": "active",
  "color": "green",
  "similarity": 100,
  "rekognitionId": "public/bilal.jpeg",
  "hasTicket": true,
  "ticketStatus": "confirmed",
  "ticketDetails": {
    "quantity": 1,
    "seatType": "general",
    "totalPrice": 99.99,
    "bookedAt": "2024-04-02T10:30:00.000Z"
  },
  "timestamp": "2024-04-02T11:45:23.123Z"
}
```

## Test 2: Rekognition + Booking Verification

**Endpoint:** `POST /api/face-verify`

This uses AWS Rekognition first, then looks up booking.

### Using cURL with File Upload:
```bash
curl -X POST http://localhost:3000/api/face-verify \
  -F "image=@/path/to/photo.jpg" \
  -F "eventId=507f1f77bcf86cd799439011"
```

### Using Node.js with FormData:
```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('image', fs.createReadStream('/path/to/photo.jpg'));
form.append('eventId', '507f1f77bcf86cd799439011');

const response = await fetch('http://localhost:3000/api/face-verify', {
  method: 'POST',
  body: form
});

const data = await response.json();
console.log('Total response time with Rekognition: ~500-800ms');
console.log(data);
```

### Expected Response (500-800ms):
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
    "bookedAt": "2024-04-02T10:30:00.000Z"
  },
  "timestamp": "2024-04-02T11:45:23.123Z"
}
```

## Test 3: Performance Comparison

### Direct Verification (Fast):
```javascript
console.time('Direct Verification');
// Query 1: face-table findOne → ~10ms
// Query 2: bookings findOne → ~10ms
// Total: ~20-30ms ✓
console.timeEnd('Direct Verification');
```

### With Rekognition:
```javascript
console.time('With Rekognition');
// Image processing → ~5-10ms
// AWS Rekognition API → ~400-600ms (AWS overhead)
// face-table findOne → ~10ms
// bookings findOne → ~10ms
// Total: ~500-800ms (bottleneck = AWS)
console.timeEnd('With Rekognition');
```

## Test 4: Check Response Contains Booking Data

Verify the response includes all booking details:

```javascript
const data = await response.json();

console.assert(data.hasTicket === true, 'Should have ticket');
console.assert(data.ticketStatus === 'confirmed', 'Status should be confirmed');
console.assert(data.ticketDetails.quantity === 1, 'Quantity should be 1');
console.assert(data.ticketDetails.seatType === 'general', 'Seat type should match');
console.assert(data.color === 'green', 'Color should be green for active user with ticket');

console.log('✓ All assertions passed');
```

## Test 5: Edge Cases

### User Not Found:
```bash
curl -X POST http://localhost:3000/api/face-verify-direct \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "nonexistent-user-id",
    "eventId": "507f1f77bcf86cd799439011"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "userId": null,
  "fullName": null,
  "status": "not_found",
  "color": "red",
  "similarity": 0,
  "timestamp": "..."
}
```

### Booking Not Found (No Ticket):
```bash
curl -X POST http://localhost:3000/api/face-verify-direct \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69b1b66bca13f3e8d88925d3",
    "eventId": "507f1f77bcf86cd799439012"  # Different eventId
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "userId": "69b1b66bca13f3e8d88925d3",
  "fullName": "Bilal",
  "status": "active",
  "color": "green",
  "similarity": 100,
  "hasTicket": false,
  "ticketStatus": null,
  "ticketDetails": null,
  "timestamp": "..."
}
```

### Ticket Already Used:
Update booking with `isUsed: true` and test:

```bash
curl -X POST http://localhost:3000/api/face-verify-direct \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69b1b66bca13f3e8d88925d3",
    "eventId": "507f1f77bcf86cd799439011"
  }'
```

**Expected Response** (ticketStatus = 'already_used', color = 'blue'):
```json
{
  "success": true,
  "userId": "69b1b66bca13f3e8d88925d3",
  "fullName": "Bilal",
  "status": "active",
  "color": "green",
  "hasTicket": true,
  "ticketStatus": "already_used",
  "ticketDetails": {
    "quantity": 1,
    "seatType": "general",
    "totalPrice": 99.99,
    "bookedAt": "2024-04-02T10:30:00.000Z"
  },
  "timestamp": "..."
}
```

## Performance Metrics to Log

The app logs timing for each operation. Check logs for:

```
[D] direct_verify - Database query completed, duration: 12ms, found: true
[D] fast_booking_status - Fast booking status query completed, duration: 9ms, found: true
```

## Postman Collection

To import into Postman, use the provided examples:

1. **Direct Verification**
   - Method: POST
   - URL: `{{baseUrl}}/api/face-verify-direct`
   - Body (JSON): userId, eventId

2. **Rekognition Verification**
   - Method: POST
   - URL: `{{baseUrl}}/api/face-verify`
   - Body (form-data): image file, eventId

## Key Takeaways

✅ **Direct verification is VERY FAST** (30-50ms) - use this when Rekognition isn't needed
✅ **Booking data is included in response** - no separate API call needed
✅ **All edge cases handled** - missing users, missing tickets, already used tickets
✅ **Performance metrics logged** - monitor timing in production logs

## Troubleshooting

**Response taking >100ms for direct verification:**
1. Check MongoDB indexes: `db.bookings.getIndexes()`
2. Verify `.lean()` and `.select()` are applied
3. Check network latency to MongoDB

**"Invalid eventId format" error:**
- Ensure eventId is a valid MongoDB ObjectId
- Format: 24 hex characters (e.g., "507f1f77bcf86cd799439011")

**"Missing required fields" error:**
- POST /api/face-verify-direct requires: userId and eventId
- POST /api/face-verify requires: image file and eventId (multipart form)
