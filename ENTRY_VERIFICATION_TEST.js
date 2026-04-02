// Test file for Entry Verification API
// Run in your API environment with valid userId and eventId

// Test 1: Valid check-in during event
console.log('TEST 1: Valid check-in during event');
fetch('http://localhost:5000/api/booking/entry/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: '507f1f77bcf86cd799439011',
    eventId: '507f1f77bcf86cd799439012'
  })
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));

// Test 2: Check-in outside event time
console.log('\nTEST 2: Check-in outside event time');
fetch('http://localhost:5000/api/booking/entry/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: '507f1f77bcf86cd799439011',
    eventId: '507f1f77bcf86cd799439012'
  })
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));

// Test 3: Missing userId
console.log('\nTEST 3: Missing userId (should fail with 400)');
fetch('http://localhost:5000/api/booking/entry/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventId: '507f1f77bcf86cd799439012'
  })
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));

// Test 4: Non-existent event
console.log('\nTEST 4: Non-existent event');
fetch('http://localhost:5000/api/booking/entry/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: '507f1f77bcf86cd799439011',
    eventId: '000000000000000000000000'
  })
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));

// Test 5: Multiple check-ins
console.log('\nTEST 5: Multiple check-ins (run endpoint twice)');
async function testMultipleCheckIns() {
  const payload = {
    userId: '507f1f77bcf86cd799439011',
    eventId: '507f1f77bcf86cd799439012'
  };
  
  // First check-in
  console.log('First check-in:');
  let res1 = await fetch('http://localhost:5000/api/booking/entry/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let data1 = await res1.json();
  console.log('checkInCount:', data1.checkInCount);
  
  // Second check-in
  console.log('Second check-in:');
  let res2 = await fetch('http://localhost:5000/api/booking/entry/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let data2 = await res2.json();
  console.log('checkInCount:', data2.checkInCount);
  console.log('All check-ins:', data2.allCheckIns);
}

// Uncomment to run
// testMultipleCheckIns().catch(console.error);
