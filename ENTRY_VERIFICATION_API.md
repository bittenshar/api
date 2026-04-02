# Entry Verification API

## Endpoint: POST /api/booking/entry/verify

Entry verification endpoint for checking in users to events. Allows multiple check-ins per ticket and tracks all entry timestamps. Designed for venue staff to verify and record guest attendance at events.

### Request Specification

#### Method & Path
```
POST /api/booking/entry/verify
```

#### Authentication
Not required

#### Request Headers
```
Content-Type: application/json
```

#### Request Body
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "eventId": "507f1f77bcf86cd799439012"
}
```

**Required Parameters:**
- `userId` (ObjectId): MongoDB User ID
- `eventId` (ObjectId): MongoDB Event ID

---

## Response Specification

### Success Response (GREENn Status)
**Status Code:** `200 OK`

```json
{
  "status": "GREENn",
  "bookingId": "507f1f77bcf86cd799439013",
  "eventName": "Summer Music Festival 2024",
  "message": "Ticket is checked 1 time",
  "checkInCount": 1,
  "eventTime": {
    "utc": {
      "startTime": "2024-04-15T18:00:00.000Z",
      "endTime": "2024-04-15T23:00:00.000Z"
    },
    "ist": {
      "startTime": "2024-04-15T23:30:00+05:30",
      "endTime": "2024-04-16T04:30:00+05:30"
    }
  },
  "currentTime": {
    "utc": "2024-04-15T20:30:00.000Z",
    "ist": "2024-04-16T02:00:00+05:30"
  },
  "isEventRunning": true,
  "checkedInAt": "2024-04-15T20:30:00.000Z",
  "checkedInAtIST": "2024-04-16T02:00:00+05:30",
  "allCheckIns": [
    {
      "timestamp": "2024-04-15T20:30:00.000Z",
      "timestampIST": "2024-04-16T02:00:00+05:30",
      "checkInNumber": 1
    }
  ]
}
```

### Error Response - Event Not Found
**Status Code:** `200 OK`

```json
{
  "status": "RED",
  "reason": "EVENT_NOT_FOUND",
  "eventId": "507f1f77bcf86cd799439012"
}
```

### Error Response - Event Not Active
**Status Code:** `200 OK`

```json
{
  "status": "RED",
  "reason": "EVENT_NOT_ACTIVE",
  "eventName": "Summer Music Festival 2024",
  "eventStatus": "cancelled"
}
```

### Error Response - Outside Event Time
**Status Code:** `200 OK`

```json
{
  "status": "RED",
  "reason": "OUTSIDE_EVENT_TIME",
  "eventName": "Summer Music Festival 2024",
  "eventTime": {
    "utc": {
      "startTime": "2024-04-15T18:00:00.000Z",
      "endTime": "2024-04-15T23:00:00.000Z"
    },
    "ist": {
      "startTime": "2024-04-15T23:30:00+05:30",
      "endTime": "2024-04-16T04:30:00+05:30"
    }
  },
  "currentTime": {
    "utc": "2024-04-16T00:30:00.000Z",
    "ist": "2024-04-16T06:00:00+05:30"
  },
  "isEventRunning": false
}
```

### Error Response - No Valid Smart Ticket
**Status Code:** `200 OK`

```json
{
  "status": "RED",
  "reason": "NO_VALID_SMART_TICKET",
  "eventName": "Summer Music Festival 2024",
  "eventTime": {
    "utc": {
      "startTime": "2024-04-15T18:00:00.000Z",
      "endTime": "2024-04-15T23:00:00.000Z"
    },
    "ist": {
      "startTime": "2024-04-15T23:30:00+05:30",
      "endTime": "2024-04-16T04:30:00+05:30"
    }
  },
  "currentTime": {
    "utc": "2024-04-15T20:30:00.000Z",
    "ist": "2024-04-16T02:00:00+05:30"
  }
}
```

### Server Error Response
**Status Code:** `500 Internal Server Error`

```json
{
  "status": "ERROR",
  "message": "Internal server error message",
  "timestamp": "2024-04-15T20:30:00.000Z"
}
```

---

## Status Codes & Meanings

### Response Status Field

| Status | Meaning | Action |
|--------|---------|--------|
| `GREENn` | Entry verified and recorded | ALLOW_ENTRY |
| `RED` | Entry denied or validation failed | DENY_ENTRY |
| `ERROR` | Server-side error | DENY_ENTRY |

### HTTP Status Codes

| Code | Scenario |
|------|----------|
| `200` | Request processed (success or validation failure) |
| `500` | Unexpected server error |
| `400` | Invalid request parameters |

### Reason Codes (when status is RED)

| Reason | Meaning | Resolution |
|--------|---------|-----------|
| `EVENT_NOT_FOUND` | Event ID does not exist | Verify event ID |
| `EVENT_NOT_ACTIVE` | Event inactive/cancelled | Contact organizer |
| `OUTSIDE_EVENT_TIME` | Check-in outside event hours | Try during event time |
| `NO_VALID_SMART_TICKET` | No confirmed smart ticket | Purchase or verify ticket |

---

## Key Features

### 1. Multiple Check-Ins
- Same ticket can be checked-in multiple times
- Each check-in increments `checkInCount`
- All check-in timestamps recorded in `allCheckIns` array
- Useful for multi-day events or re-entry scenarios

### 2. Smart Ticket Validation
- Only accepts tickets with `tickettype: 'smart'`
- Supports booking statuses: `confirmed` and `used`
- Rejects traditional tickets and cancelled bookings

### 3. Status Transitions
- **First check-in:** Booking status changes `confirmed` → `used`
- **Subsequent check-ins:** Status remains `used`, only count increments
- **usedAt field:** Set only on first check-in for tracking

### 4. Timezone Handling
- All internal logic uses UTC (prevents timezone bugs)
- IST (Indian Standard Time) provided for display only
- Automatic +05:30 offset applied for IST conversions

### 5. Event Validation
- Event must exist and have status `active`
- Current time must be within startTime and endTime
- Event time window strictly enforced

---

## Database Schema

### Booking Fields (Updated)
```javascript
{
  userId: ObjectId,              // User being checked in
  eventId: ObjectId,             // Event for check-in
  tickettype: String,            // Must be "smart"
  status: String,                // "confirmed" or "used"
  
  // Check-in tracking (incremented)
  checkInCount: Number,          // Incremented on each check-in
  checkIns: [{
    timestamp: Date,             // UTC timestamp
    timestampIST: String,        // IST formatted string
    checkInNumber: Number        // Sequential check-in number
  }],
  
  // Status fields
  usedAt: Date,                  // Set on first check-in
}
```

### Event Fields
```javascript
{
  eventName: String,             // Event display name
  startTime: Date,               // UTC start time
  endTime: Date,                 // UTC end time
  status: String,                // "active", "inactive", "cancelled", "completed"
  venue: String,                 // Venue information
  capacity: Number,              // Event capacity
  currentAttendance: Number,     // Real-time attendance
}
```

---

## Usage Examples

### Example 1: Valid Check-In During Event

**Request:**
```bash
curl -X POST http://localhost:5000/api/booking/entry/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "eventId": "507f1f77bcf86cd799439012"
  }'
```

**Response (200 OK):**
```json
{
  "status": "GREENn",
  "bookingId": "507f1f77bcf86cd799439013",
  "eventName": "Summer Music Festival 2024",
  "checkInCount": 1,
  "isEventRunning": true
}
```

### Example 2: Check-In Before Event Starts

**Request:**
```bash
curl -X POST http://localhost:5000/api/booking/entry/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "eventId": "507f1f77bcf86cd799439012"
  }'
```

**Response (200 OK):**
```json
{
  "status": "RED",
  "reason": "OUTSIDE_EVENT_TIME",
  "eventName": "Summer Music Festival 2024",
  "isEventRunning": false
}
```

### Example 3: Multiple Check-Ins (Re-Entry)

**First Check-In:**
```bash
curl -X POST http://localhost:5000/api/booking/entry/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "eventId": "507f1f77bcf86cd799439012"
  }'
```
Response: `checkInCount: 1`, status: `GREENn`

**Second Check-In (same call):**
```bash
curl -X POST http://localhost:5000/api/booking/entry/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "eventId": "507f1f77bcf86cd799439012"
  }'
```
Response: `checkInCount: 2`, status: `GREENn`

---

## Error Handling

### Input Validation
- Missing `userId` or `eventId`: Returns 400 Bad Request
- Invalid ObjectId format: Returns 400 Bad Request
- Invalid parameters trigger validation before database queries

### Business Logic Errors
| Scenario | Response Status | HTTP Code |
|----------|-----------------|-----------|
| Event not found | RED - EVENT_NOT_FOUND | 200 |
| Event inactive | RED - EVENT_NOT_ACTIVE | 200 |
| Outside time window | RED - OUTSIDE_EVENT_TIME | 200 |
| No smart ticket | RED - NO_VALID_SMART_TICKET | 200 |

### Server Errors
- Database failures, connection issues, unexpected exceptions
- Returns `500 Internal Server Error` with ERROR status
- Error details logged for debugging

---

## Implementation Notes

### Performance Considerations
1. Event lookup by ID is indexed
2. Booking query uses compound index on (userId, eventId, tickettype)
3. Check-in array append is atomic operation
4. All time operations in UTC (no timezone conversions overhead)

### Security
- No authentication required (designed for public venue entry)
- Only smart tickets allowed (traditional tickets rejected)
- Event must be active and within time window
- Rate limiting recommended for production

### Logging
- All check-ins logged with userId, eventId, checkInCount
- Event validation failures logged with reason codes
- Performance metrics tracked for database operations
- Error stack traces logged for debugging

---

## Related Files

- [Entry Verification Controller](controllers/entryVerification.js)
- [Booking Model](models/Booking.js)
- [Event Model](models/Event.js)
- [Booking Service](services/booking.js)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-04-15 | 1.0 | Initial implementation |
| | | - Multiple check-ins support |
| | | - UTC/IST timezone handling |
| | | - Full error response documentation |
| | | - Event validation logic |
