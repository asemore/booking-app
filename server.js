require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const Beds24API = require('./beds24API');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);
app.use(express.static('public'));

// Beds24 API Configuration
const BEDS24_API_TOKEN = process.env.BEDS24_API_TOKEN || null;

// Single property configuration (focus on property 298408)
const ROOM_CONFIG = {
  jason: {
    propertyId: process.env.JASON_PROPERTY_ID || null,
    roomId: process.env.JASON_ROOM_ID || null,
    name: 'jason'
  },
  smile: {
    propertyId: process.env.SMILE_PROPERTY_ID || null,
    roomId: process.env.SMILE_ROOM_ID || null,
    name: 'smile'
  },
  maria: {
    propertyId: process.env.MARIA_PROPERTY_ID || null,
    roomId: process.env.MARIA_ROOM_ID || null,
    name: 'maria'
  }
};

// Initialize Beds24 API clients per room/property
const beds24Clients = {};
if (BEDS24_API_TOKEN) {
  for (const [roomName] of Object.entries(ROOM_CONFIG)) {
    beds24Clients[roomName] = new Beds24API(BEDS24_API_TOKEN);
  }
}

const hasBeds24Clients = () => Object.keys(beds24Clients).length > 0;
let lastBeds24FetchStats = [];

// Generate sample booking data for testing
function generateSampleBookings(roomName) {
  const bookings = [];
  const today = new Date();
  const sources = ['airbnb', 'booking'];
  const guests = ['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Johnson', 'Mike Brown'];
  
  // Generate 5-10 random bookings for the next 3 months
  const numBookings = 5 + Math.floor(Math.random() * 5);
  
  for (let i = 0; i < numBookings; i++) {
    const startOffset = Math.floor(Math.random() * 90); // Random day in next 90 days
    const duration = 2 + Math.floor(Math.random() * 7); // 2-8 days
    
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + startOffset);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration);
    
    bookings.push({
      id: `${roomName}-${i}-${Date.now()}`,
      guestName: guests[Math.floor(Math.random() * guests.length)],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      source: sources[Math.floor(Math.random() * sources.length)],
      room: roomName
    });
  }
  
  return bookings;
}

// Fetch bookings from Beds24 API
async function fetchBeds24Bookings() {
  try {
    // Get bookings for roughly the next year (365 days)
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 7); // include a small buffer before today

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 365);
    
    const allBookings = [];
    const stats = [];

    for (const [roomName, client] of Object.entries(beds24Clients)) {
      try {
        const roomConfig = ROOM_CONFIG[roomName];
        const bookings = await client.getBookingsByDateRange(
          startDate,
          endDate,
          roomConfig.propertyId,
          roomConfig.roomId
        );

        console.log(`[Beds24] ${roomName}: received ${bookings.length} bookings from API`);
        if (bookings.length > 0) {
          const sample = bookings[0];
          console.log(`[Beds24] ${roomName}: sample booking ->`, {
            id: sample.id || sample.bookId,
            arrival: sample.arrival || sample.firstNight,
            departure: sample.departure || sample.lastNight,
            room: sample.room || sample.roomId,
            roomName: sample.roomName || sample.propertyName,
            status: sample.status
          });
        }

        const roomBookings = bookings
          .filter(booking => {
            if (!roomConfig.roomId) return true;
            const roomIdentifier = booking.room || booking.roomId || booking.room_id;
            return String(roomIdentifier) === String(roomConfig.roomId);
          })
          .map(booking => ({
            ...booking,
            room: roomName,
            startDate: booking.startDate ? booking.startDate.toISOString() : null,
            endDate: booking.endDate ? booking.endDate.toISOString() : null
          }));

        console.log(`[Beds24] ${roomName}: ${roomBookings.length} bookings after room filter`);
        stats.push({
          room: roomName,
          totalFromApi: bookings.length,
          afterRoomFilter: roomBookings.length
        });

        allBookings.push(...roomBookings);
      } catch (error) {
        console.error(`Error fetching bookings for ${roomName}:`, error.message);
      }
    }

    lastBeds24FetchStats = stats;
    return allBookings;
  } catch (error) {
    console.error('Error fetching Beds24 bookings:', error.message);
    throw error;
  }
}

// API endpoint to get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    let allBookings = [];
    
    if (hasBeds24Clients()) {
      // Fetch from Beds24 API
      allBookings = await fetchBeds24Bookings();
      console.log(`Fetched ${allBookings.length} bookings from Beds24 API`);
    } else {
      // Generate sample data if no API credentials
      console.log('No Beds24 API credentials found, using sample data');
      for (const roomName of Object.keys(ROOM_CONFIG)) {
        const roomBookings = generateSampleBookings(roomName);
        allBookings.push(...roomBookings);
      }
    }
    
    res.json({
      success: true,
      bookings: allBookings,
      rooms: Object.keys(ROOM_CONFIG),
      dataSource: hasBeds24Clients() ? 'beds24' : 'sample'
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings',
      message: error.message
    });
  }
});

// API endpoint to get bookings for a specific room
app.get('/api/bookings/:room', async (req, res) => {
  try {
    const roomName = req.params.room.toLowerCase();
    
    if (!ROOM_CONFIG.hasOwnProperty(roomName)) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    let bookings;
    
    if (hasBeds24Clients()) {
      // Fetch from Beds24 API
      const allBookings = await fetchBeds24Bookings();
      bookings = allBookings.filter(b => b.room === roomName);
    } else {
      // Generate sample data
      bookings = generateSampleBookings(roomName);
    }
    
    res.json({
      success: true,
      bookings,
      room: roomName,
      dataSource: hasBeds24Clients() ? 'beds24' : 'sample'
    });
  } catch (error) {
    console.error(`Error fetching bookings for room ${req.params.room}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room bookings',
      message: error.message
    });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Booking app server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the app`);
  console.log('\n=== Beds24 API Configuration ===');
  
  if (hasBeds24Clients()) {
    console.log('✓ Beds24 API credentials configured');
    console.log('  Data source: Beds24 API');
    console.log('  Rooms configured:');
    for (const [roomName, config] of Object.entries(ROOM_CONFIG)) {
      if (config.propertyId) {
        console.log(`    - ${roomName.toUpperCase()}: Property ${config.propertyId}, Room ${config.roomId || 'n/a'}`);
      } else {
        console.log(`    - ${roomName.toUpperCase()}: Property not set, Room ${config.roomId || 'n/a'}`);
      }
    }
  } else {
    console.log('✗ No Beds24 API credentials found');
    console.log('  Data source: Sample data');
    console.log('\nTo use Beds24 API, set environment variables:');
    console.log('  BEDS24_API_TOKEN - Your Beds24 API v2 token');
    console.log('  JASON_PROPERTY_ID - Beds24 property ID (e.g. 298408)');
    console.log('  JASON_ROOM_ID  - Beds24 room ID for the listing (optional)');
  }
});

module.exports = app;
