import mongoose from 'mongoose';
import Booking from '../models/Booking.js';

export const verifyEntryLogic = async (userId, eventId) => {
  console.log('========== VERIFY ENTRY LOGIC START ==========');
  const startTime = Date.now();

  if (!userId || !eventId) {
    return {
      status: 'fail',
      action: 'DENY_ENTRY',
      message: 'userId and eventId are required'
    };
  }

  // Convert to ObjectId if they are valid MongoDB IDs
  let userObjectId = userId;
  let eventObjectId = eventId;
  
  if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
    userObjectId = new mongoose.Types.ObjectId(userId);
  }
  
  if (typeof eventId === 'string' && mongoose.Types.ObjectId.isValid(eventId)) {
    eventObjectId = new mongoose.Types.ObjectId(eventId);
  }

  // ✅ Optimized query - select only needed fields
  const booking = await Booking.findOne({
    userId: userObjectId,
    eventId: eventObjectId
  }).populate('userId', 'name email phone')
    .populate('eventId', 'name date location')
    .select('status entryTime checkInCount checkIns ticketNumbers tickettype totalPrice paymentStatus confirmedAt');

  const queryTime = Date.now() - startTime;
  console.log(`Booking query completed in ${queryTime}ms`);

  if (!booking) {
    return {
      status: 'BLACK',
      action: 'DENY_ENTRY',
      reason: 'No booking found',
      userId: userId.toString(),
      userName: null,
      bookingId: null,
      checkInCount: 0
    };
  }

  // Prepare booking details
  const bookingDetails = {
    bookingId: booking._id,
    bookingStatus: booking.status,
    ticketType: booking.tickettype,
    ticketNumber: booking.ticketNumbers,
    totalPrice: booking.totalPrice,
    paymentStatus: booking.paymentStatus,
    confirmedAt: booking.confirmedAt,
    eventName: booking.eventId?.name,
    eventDate: booking.eventId?.date
  };

  // ✅ Check for 'used' status (already entered/completed)
  if (booking.status === 'used') {
    return {
      status: 'BLUE',
      action: 'ALREADY_ENTERED',
      reason: 'Ticket already used',
      message: `Already checked in ${booking.checkInCount || 1} time(s)`,
      userId: userId.toString(),
      userName: booking.userId?.name || null,
      entryTime: booking.entryTime,
      checkInCount: booking.checkInCount || 1,
      checkInTime: booking.checkInTime,
      bookingId: booking._id,
      bookingStatus: booking.status,
      ticketInfo: bookingDetails
    };
  }

  // ✅ Check if already has entryTime
  if (booking.entryTime) {
    return {
      status: 'BLUE',
      action: 'ALREADY_ENTERED',
      reason: `Already entered at ${new Date(booking.entryTime).toLocaleTimeString()}`,
      message: `Previous entry at ${new Date(booking.entryTime).toLocaleString()}`,
      userId: userId.toString(),
      userName: booking.userId?.name || null,
      entryTime: booking.entryTime,
      checkInCount: booking.checkInCount || 1,
      bookingId: booking._id,
      bookingStatus: booking.status,
      ticketInfo: bookingDetails
    };
  }

  // ✅ Check booking status
  if (booking.status !== 'confirmed') {
    return {
      status: 'RED',
      action: 'DENY_ENTRY',
      reason: `Booking status: ${booking.status}`,
      message: 'Booking is not confirmed',
      userId: userId.toString(),
      userName: booking.userId?.name || null,
      bookingId: booking._id,
      bookingStatus: booking.status,
      ticketInfo: bookingDetails
    };
  }

  // ✅ Record new entry with check-in tracking
  const newCheckInNumber = (booking.checkInCount || 0) + 1;
  
  booking.entryTime = new Date();
  booking.facialEntryVerified = true;
  booking.faceVerificationTime = new Date();
  booking.checkInCount = newCheckInNumber;
  
  // Initialize checkIns array if it doesn't exist
  if (!booking.checkIns) {
    booking.checkIns = [];
  }
  
  // Add new check-in record
  booking.checkIns.push({
    timestamp: new Date(),
    timestampIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    checkInNumber: newCheckInNumber,
    method: 'face_verification'
  });
  
  await booking.save();
  
  const saveTime = Date.now() - startTime;
  console.log(`Booking saved in ${saveTime}ms`);

  // Return success with full details
  return {
    status: 'GREEN',
    action: 'ALLOW_ENTRY',
    message: `✅ Entry verified! Check-in #${newCheckInNumber} successful`,
    userId: userId.toString(),
    userName: booking.userId?.name || null,
    entryTime: booking.entryTime,
    checkInCount: newCheckInNumber,
    checkInTime: booking.entryTime,
    bookingId: booking._id,
    bookingStatus: booking.status,
    ticketInfo: {
      ...bookingDetails,
      checkInNumber: newCheckInNumber,
      totalCheckIns: newCheckInNumber,
      facialVerified: true,
      verificationTime: booking.faceVerificationTime
    }
  };
};

/* full detils
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';

export const verifyEntryLogic = async (userId, eventId) => {
  console.log('========== VERIFY ENTRY LOGIC START ==========');
  const startTime = Date.now();

  if (!userId || !eventId) {
    return {
      status: 'fail',
      action: 'DENY_ENTRY',
      message: 'userId and eventId are required',
      reason: 'Missing required parameters'
    };
  }

  // Convert to ObjectId if they are valid MongoDB IDs
  let userObjectId = userId;
  let eventObjectId = eventId;
  
  if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
    userObjectId = new mongoose.Types.ObjectId(userId);
  }
  
  if (typeof eventId === 'string' && mongoose.Types.ObjectId.isValid(eventId)) {
    eventObjectId = new mongoose.Types.ObjectId(eventId);
  }

  // Optimized query - select only needed fields for performance
  const booking = await Booking.findOne({
    userId: userObjectId,
    eventId: eventObjectId
  }).populate('userId', 'name email phone')
    .populate('eventId', 'name date location')
    .select('status entryTime checkInCount checkIns ticketNumbers tickettype totalPrice paymentStatus confirmedAt faceVerified faceVerificationTime');

  const queryTime = Date.now() - startTime;
  console.log(`Booking query completed in ${queryTime}ms`);

  if (!booking) {
    return {
      status: 'BLACK',
      action: 'DENY_ENTRY',
      reason: 'No booking found',
      message: 'No valid booking found for this user and event',
      userId: userId.toString(),
      userName: null,
      bookingId: null,
      checkInCount: 0,
      ticketInfo: null
    };
  }

  // Prepare complete booking details
  const bookingDetails = {
    bookingId: booking._id,
    bookingStatus: booking.status,
    ticketType: booking.tickettype,
    ticketNumber: booking.ticketNumbers,
    totalPrice: booking.totalPrice,
    paymentStatus: booking.paymentStatus,
    confirmedAt: booking.confirmedAt,
    eventName: booking.eventId?.name,
    eventDate: booking.eventId?.date,
    eventLocation: booking.eventId?.location,
    faceVerified: booking.faceVerified || false,
    faceVerificationTime: booking.faceVerificationTime,
    hasTicket: true
  };

  // Prepare check-in details
  const checkInDetails = {
    totalCheckIns: booking.checkInCount || 0,
    checkIns: booking.checkIns || [],
    lastCheckIn: booking.checkIns && booking.checkIns.length > 0 
      ? booking.checkIns[booking.checkIns.length - 1] 
      : null,
    firstCheckIn: booking.checkIns && booking.checkIns.length > 0 
      ? booking.checkIns[0] 
      : null,
    entryTime: booking.entryTime
  };

  // Case 1: Booking status is 'used' or already has entry
  if (booking.status === 'used' || booking.entryTime) {
    return {
      status: 'BLUE',
      action: 'ALREADY_ENTERED',
      reason: booking.status === 'used' ? 'Ticket already used' : 'Entry already recorded',
      message: `Already checked in ${booking.checkInCount || 1} time(s)`,
      userId: userId.toString(),
      userName: booking.userId?.name || null,
      entryTime: booking.entryTime,
      
      // Full booking details
      bookingId: booking._id,
      bookingStatus: booking.status,
      checkInCount: booking.checkInCount || 1,
      
      // Complete ticket info
      ticketInfo: {
        ...bookingDetails,
        ...checkInDetails,
        status: 'ALREADY_ENTERED',
        canEnter: false,
        message: `Ticket already used for entry ${booking.checkInCount || 1} time(s)`
      },
      
      // Recent check-ins (last 5)
      recentCheckIns: booking.checkIns 
        ? booking.checkIns.slice(-5).reverse() 
        : [],
      
      // Current check-in (for consistency)
      currentCheckIn: null,
      
      // Summary
      summary: {
        totalEntries: booking.checkInCount || 1,
        firstEntry: checkInDetails.firstCheckIn?.timestamp || booking.entryTime,
        lastEntry: checkInDetails.lastCheckIn?.timestamp || booking.entryTime,
        faceVerified: booking.faceVerified || false,
        canEnter: false
      }
    };
  }

  // Case 2: Booking not confirmed
  if (booking.status !== 'confirmed') {
    return {
      status: 'RED',
      action: 'DENY_ENTRY',
      reason: `Booking status: ${booking.status}`,
      message: 'Booking is not confirmed. Please complete payment.',
      userId: userId.toString(),
      userName: booking.userId?.name || null,
      bookingId: booking._id,
      bookingStatus: booking.status,
      checkInCount: booking.checkInCount || 0,
      ticketInfo: {
        ...bookingDetails,
        status: 'NOT_CONFIRMED',
        canEnter: false,
        message: `Booking status is '${booking.status}'. Entry not allowed.`
      },
      recentCheckIns: [],
      currentCheckIn: null,
      summary: {
        totalEntries: 0,
        message: 'Booking not confirmed',
        canEnter: false
      }
    };
  }

  // Case 3: NEW ENTRY - Record check-in
  const newCheckInNumber = (booking.checkInCount || 0) + 1;
  const now = new Date();
  const nowIST = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  
  // Update booking with new check-in
  booking.entryTime = now;
  booking.facialEntryVerified = true;
  booking.faceVerificationTime = now;
  booking.faceVerified = true;
  booking.checkInCount = newCheckInNumber;
  
  if (!booking.checkIns) {
    booking.checkIns = [];
  }
  
  booking.checkIns.push({
    timestamp: now,
    timestampIST: nowIST,
    checkInNumber: newCheckInNumber,
    method: 'face_verification',
    verifiedBy: 'face_recognition_system'
  });
  
  await booking.save();
  
  const saveTime = Date.now() - startTime;
  console.log(`New check-in recorded in ${saveTime}ms`);

  // Prepare updated check-in details
  const updatedCheckInDetails = {
    ...checkInDetails,
    totalCheckIns: newCheckInNumber,
    lastCheckIn: {
      timestamp: now,
      timestampIST: nowIST,
      checkInNumber: newCheckInNumber,
      method: 'face_verification'
    }
  };

  // Return success with full details
  return {
    status: 'GREEN',
    action: 'ALLOW_ENTRY',
    message: `✅ Entry verified! Check-in #${newCheckInNumber} successful`,
    reason: null,
    userId: userId.toString(),
    userName: booking.userId?.name || null,
    entryTime: now,
    
    // Full booking details
    bookingId: booking._id,
    bookingStatus: booking.status,
    checkInCount: newCheckInNumber,
    
    // Complete ticket info
    ticketInfo: {
      ...bookingDetails,
      ...updatedCheckInDetails,
      currentCheckInNumber: newCheckInNumber,
      totalCheckIns: newCheckInNumber,
      facialVerified: true,
      verificationTime: now,
      verificationMethod: 'face_recognition',
      status: 'ACTIVE',
      canEnter: true,
      entryTime: now,
      entryTimeIST: nowIST,
      message: `Check-in #${newCheckInNumber} recorded successfully`
    },
    
    // This check-in details
    currentCheckIn: {
      number: newCheckInNumber,
      time: now,
      timeIST: nowIST,
      method: 'face_verification',
      status: 'success'
    },
    
    // Recent check-ins (last 5)
    recentCheckIns: booking.checkIns.slice(-5).reverse(),
    
    // Summary
    summary: {
      totalEntries: newCheckInNumber,
      firstEntry: booking.checkIns[0]?.timestamp || now,
      lastEntry: now,
      faceVerified: true,
      canEnter: true,
      message: `Check-in successful. Total entries: ${newCheckInNumber}`
    }
  };
};

*/