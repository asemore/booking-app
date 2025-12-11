// ICS Parser Module
// Parses ICS (iCalendar) format data to extract booking information

function parseICS(icsData) {
  const events = [];
  const lines = icsData.split(/\r?\n/);
  let currentEvent = null;
  let currentProperty = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Handle line continuation (lines starting with space or tab)
    while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
      i++;
      line += lines[i].trim();
    }
    
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      events.push(currentEvent);
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        
        // Parse different properties
        if (key.startsWith('DTSTART')) {
          currentEvent.start = parseICSDate(value);
        } else if (key.startsWith('DTEND')) {
          currentEvent.end = parseICSDate(value);
        } else if (key === 'SUMMARY') {
          currentEvent.summary = value;
        } else if (key === 'DESCRIPTION') {
          currentEvent.description = value;
        } else if (key === 'UID') {
          currentEvent.uid = value;
        } else if (key === 'LOCATION') {
          currentEvent.location = value;
        }
      }
    }
  }
  
  return events;
}

function parseICSDate(dateString) {
  // ICS dates can be in format: YYYYMMDD or YYYYMMDDTHHMMSSZ
  if (!dateString) return null;
  
  // Remove VALUE=DATE: prefix if present
  dateString = dateString.replace(/^VALUE=DATE:/, '');
  
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateString.substring(6, 8), 10);
  
  if (dateString.length > 8) {
    // Has time component
    const hour = parseInt(dateString.substring(9, 11), 10);
    const minute = parseInt(dateString.substring(11, 13), 10);
    const second = parseInt(dateString.substring(13, 15), 10);
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  } else {
    // Date only
    return new Date(year, month, day);
  }
}

function extractGuestName(summary) {
  // Try to extract guest name from summary
  // Common patterns: "Reserved for [Name]", "[Name] - Airbnb", etc.
  if (!summary) return 'Guest';
  
  // Remove common prefixes
  let name = summary
    .replace(/^Reserved for /i, '')
    .replace(/^Reservation - /i, '')
    .replace(/ - Airbnb$/i, '')
    .replace(/ - Booking\.com$/i, '')
    .trim();
  
  return name || 'Guest';
}

function determineSource(event) {
  // Determine if booking is from Airbnb or Booking.com
  const summary = (event.summary || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  const uid = (event.uid || '').toLowerCase();
  
  if (summary.includes('airbnb') || description.includes('airbnb') || uid.includes('airbnb')) {
    return 'airbnb';
  } else if (summary.includes('booking') || description.includes('booking') || uid.includes('booking')) {
    return 'booking';
  }
  
  // Default to airbnb if unclear
  return 'airbnb';
}

function processBookings(icsData) {
  const events = parseICS(icsData);
  return events.map(event => ({
    id: event.uid || Math.random().toString(36).substring(7),
    guestName: extractGuestName(event.summary),
    startDate: event.start,
    endDate: event.end,
    source: determineSource(event),
    summary: event.summary,
    description: event.description,
    location: event.location
  }));
}

module.exports = {
  parseICS,
  parseICSDate,
  extractGuestName,
  determineSource,
  processBookings
};
