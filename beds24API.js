// Beds24 API Integration Module (API v2)
// Handles fetching bookings using the Beds24 API token

const fetch = require('node-fetch');

class Beds24API {
    constructor(token) {
        this.token = token;
        this.baseUrl = 'https://api.beds24.com/v2';
    }

    /**
     * Fetch bookings from Beds24 API
     * @param {Object} params - Query parameters
     * @returns {Promise<Array>} Array of bookings
     */
    async getBookings(params = {}) {
        if (!this.token) {
            throw new Error('Beds24 API token is not configured');
        }

        const url = new URL(`${this.baseUrl}/bookings`);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(key, value);
            }
        });

        try {
            console.log('[Beds24API] Request URL:', url.toString());
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    token: this.token,
                    accept: 'application/json'
                }
            });

            const text = await response.text();
            let data = {};

            try {
                data = text ? JSON.parse(text) : {};
            } catch (parseError) {
                throw new Error(`Beds24 API returned invalid JSON: ${text}`);
            }

            if (!response.ok || (data && data.success === false) || data?.error) {
                console.warn('[Beds24API] Error response:', text);
                const message = data?.error || `Beds24 API error: ${response.status} ${response.statusText}`;
                throw new Error(message);
            }

            console.log('[Beds24API] Fetched bookings with params:', params);
            return this.processBookings(data);
        } catch (error) {
            console.error('Error fetching bookings from Beds24:', error.message);
            throw error;
        }
    }

    /**
     * Fetch bookings for a specific date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {String} propertyId - Optional property ID filter
     * @param {String} roomId - Optional room ID filter
     * @returns {Promise<Array>} Array of bookings
     */
    async getBookingsByDateRange(startDate, endDate, propertyId = null, roomId = null) {
        const params = {
            arrivalFrom: this.formatDate(startDate),
            arrivalTo: this.formatDate(endDate)
        };

        if (propertyId) {
            params.propId = propertyId;
        }

        if (roomId) {
            params.roomId = roomId;
        }

        return await this.getBookings(params);
    }

    /**
     * Process raw bookings data from Beds24
     * @param {Array|Object} data - Raw booking data
     * @returns {Array} Processed bookings
     */
    processBookings(data) {
        let bookings = [];

        if (Array.isArray(data)) {
            bookings = data;
        } else if (data && Array.isArray(data.bookings)) {
            bookings = data.bookings;
        } else if (data && Array.isArray(data.data)) {
            bookings = data.data;
        }

        return bookings.map(booking => {
            const arrival = booking.arrival || booking.arrivalDate || booking.firstNight;
            const departure = booking.departure || booking.departureDate || booking.lastNight;

            return {
                id: booking.bookId || booking.id,
                guestName: this.extractGuestName(booking),
                startDate: this.parseDate(arrival),
                endDate: this.parseDate(departure),
                source: this.determineSource(booking),
                room: booking.roomId || booking.room || booking.room_id,
                roomName: booking.roomName || booking.propertyName || booking.room,
                status: booking.status,
                price: booking.price,
                numAdult: booking.numAdult || booking.adults,
                numChild: booking.numChild || booking.children,
                rawData: booking
            };
        });
    }

    /**
     * Extract guest name from booking
     * @param {Object} booking - Booking data
     * @returns {String} Guest name
     */
    extractGuestName(booking) {
        if (booking.guestName) {
            return booking.guestName;
        }

        const firstName = booking.firstName || booking.guestFirstName || '';
        const lastName = booking.lastName || booking.guestLastName || '';

        if (firstName && lastName) {
            return `${firstName} ${lastName}`;
        } else if (firstName) {
            return firstName;
        } else if (lastName) {
            return lastName;
        }

        return booking.guest || 'Guest';
    }

    /**
     * Determine booking source (Airbnb, Booking.com, etc.)
     * @param {Object} booking - Booking data
     * @returns {String} Source identifier
     */
    determineSource(booking) {
        const referer = (booking.referer || booking.channel || '').toLowerCase();
        const source = (booking.source || booking.bookingSource || '').toLowerCase();
        const channel = (booking.channel || '').toLowerCase();

        if (referer.includes('airbnb') || source.includes('airbnb')) {
            return 'airbnb';
        } else if (referer.includes('booking') || source.includes('booking')) {
            return 'booking';
        } else if (referer.includes('expedia') || source.includes('expedia')) {
            return 'expedia';
        }

        if (
            channel === 'direct' ||
            referer.includes('direct') ||
            source.includes('direct') ||
            referer.includes('pavlosol') ||
            referer.includes('app') ||
            channel.includes('website')
        ) {
            return 'direct';
        }

        return source || referer || 'direct';
    }

    /**
     * Parse date string to Date object
     * @param {String} dateString - Date string
     * @returns {Date} Date object
     */
    parseDate(dateString) {
        if (!dateString) return null;
        // Beds24 dates are provided as YYYY-MM-DD. Creating the date at noon UTC
        // avoids browser timezone shifts that would otherwise move bookings a day earlier/later.
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        }

        const parsed = new Date(dateString);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    /**
     * Format date for API (YYYY-MM-DD)
     * @param {Date} date - Date object
     * @returns {String} Formatted date string
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

module.exports = Beds24API;
