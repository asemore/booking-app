// Booking Calendar App - Frontend JavaScript

class BookingCalendar {
    constructor() {
        const today = new Date();
        this.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
        this.viewMode = 'multi';
        this.selectedRoom = 'jason';
        this.bookings = [];
        this.rooms = ['jason', 'smile', 'maria'];
        this.filter = 'all';
        this.timelineDays = 365;
        this.resizeTimeout = null;
        this.calendarEl = null;
        this.detailsEl = null;
        this.selectedBookingId = null;
        
        this.init();
    }
    
    init() {
        this.calendarEl = document.getElementById('calendar');
        this.detailsEl = document.getElementById('bookingDetails');

        if (this.calendarEl) {
            this.calendarEl.addEventListener('click', (event) => this.handleCalendarClick(event));
            this.calendarEl.addEventListener('keydown', (event) => this.handleCalendarKeydown(event));
        }

        if (this.detailsEl) {
            this.detailsEl.classList.add('hidden');
            this.detailsEl.innerHTML = '<p class="booking-details-empty">Select a booking to see guest details.</p>';
        }

        this.setupEventListeners();
        this.loadBookings();
        this.updateMonthPicker();
        this.updateRoomSelector();
    }
    
    setupEventListeners() {
        // Room selector
        document.getElementById('roomSelector').addEventListener('change', (e) => {
            this.selectedRoom = e.target.value;
            this.renderCalendar();
        });
        
        // Navigation
        document.getElementById('prevMonthBtn').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonthBtn').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('monthPicker').addEventListener('change', (e) => this.jumpToMonth(e.target.value));
        
        // Filter
        document.getElementById('filterDropdown').addEventListener('change', (e) => {
            this.filter = e.target.value;
            this.renderCalendar();
        });

        // Handle orientation / viewport changes
        window.addEventListener('resize', () => this.handleViewportChange());
        window.addEventListener('orientationchange', () => this.handleViewportChange());
    }
    
    async loadBookings() {
        try {
            const response = await fetch('/api/bookings');
            const data = await response.json();
            
            if (data.success) {
                this.bookings = data.bookings.map(booking => ({
                    ...booking,
                    startDate: this.parseIsoDate(booking.startDate),
                    endDate: this.parseIsoDate(booking.endDate)
                }));
                this.rooms = data.rooms || ['jason', 'smile', 'maria'];
                this.updateRoomSelector();
                if (!this.rooms.includes(this.selectedRoom)) {
                    this.selectedRoom = this.rooms[0] || null;
                }
                this.renderCalendar();
            } else {
                this.showError('Failed to load bookings');
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showError('Error connecting to server');
        }
    }

    updateRoomSelector() {
        const selector = document.getElementById('roomSelector');
        if (!selector) return;

        selector.innerHTML = '';
        this.rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room;
            option.textContent = this.capitalizeFirstLetter(room);
            selector.appendChild(option);
        });

        if (this.selectedRoom && this.rooms.includes(this.selectedRoom)) {
            selector.value = this.selectedRoom;
        } else if (this.rooms.length > 0) {
            this.selectedRoom = this.rooms[0];
            selector.value = this.selectedRoom;
        } else {
            this.selectedRoom = null;
        }
    }
    
    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        this.updateMonthPicker();
        this.renderCalendar();
    }
    
    jumpToMonth(value) {
        const [year, month] = value.split('-');
        this.currentDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        this.renderCalendar();
    }
    
    updateMonthPicker() {
        const year = this.currentDate.getFullYear();
        const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
        const picker = document.getElementById('monthPicker');
        if (picker) {
            picker.value = `${year}-${month}`;
        }
    }
    
    renderCalendar() {
        const calendarEl = this.calendarEl || document.getElementById('calendar');
        if (!calendarEl) return;

        const startDate = this.normalizeDate(this.currentDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + this.timelineDays - 1);
        
        // Determine which rooms to display
        const roomsToDisplay = this.rooms;
        
        // Filter bookings
        const filteredBookings = this.getFilteredBookings();

        if (this.selectedBookingId && !filteredBookings.some(b => String(b.id) === String(this.selectedBookingId))) {
            this.selectedBookingId = null;
        }
        
        // Build calendar HTML
        let html = '<div class="calendar-grid">';
        html += this.renderMonthLabels(startDate, endDate);
        
        // Date header
        html += this.renderDateHeader(startDate, endDate);
        
        // Room rows
        roomsToDisplay.forEach(room => {
            html += this.renderRoomRow(room, filteredBookings, startDate, endDate);
        });
        
        html += '</div>';
        
        calendarEl.innerHTML = html;

        this.updateSelectedBookingHighlight();
        this.renderBookingDetails();
    }
    
    renderDateHeader(startDate, endDate) {
        let html = '<div class="date-header">';
        html += '<div class="date-header-spacer"></div>';
        const dayWidth = this.getDayWidth();
        const totalDays = this.getTotalDays(startDate, endDate);
        html += `<div class="date-cells" style="width: ${totalDays * dayWidth}px;">`;
        
        const currentDate = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        while (currentDate <= endDate) {
            const isToday = currentDate.getTime() === today.getTime();
            const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = currentDate.getDate();
            
            html += `<div class="date-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}">`;
            html += `<span class="day-name">${dayName}</span>`;
            html += `<span class="day-number">${dayNumber}</span>`;
            html += '</div>';
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        html += '</div></div>';
        return html;
    }
    
    renderRoomRow(roomName, bookings, startDate, endDate) {
        const roomBookings = bookings
            .filter(b => b.room.toLowerCase() === roomName.toLowerCase())
            .map(booking => ({
                ...booking,
                checkIn: this.normalizeDate(booking.startDate),
                checkOut: this.normalizeDate(booking.endDate)
            }))
            .filter(booking => booking.checkIn && booking.checkOut)
            .sort((a, b) => a.checkIn - b.checkIn);

        const msPerDay = this.getMsPerDay();
        const gridStart = this.normalizeDate(startDate);
        const gridEnd = this.normalizeDate(endDate);
        const gridEndExclusive = new Date(gridEnd);
        gridEndExclusive.setDate(gridEndExclusive.getDate() + 1);
        const totalDays = Math.max(0, Math.round((gridEndExclusive - gridStart) / msPerDay));
        const dayWidth = this.getDayWidth();
        const trackWidth = totalDays * dayWidth;

        const laneEndOffsets = [];
        const layoutBookings = [];

        roomBookings.forEach(booking => {
            const barStartTime = Math.max(booking.checkIn.getTime(), gridStart.getTime());
            const barEndTime = Math.min(booking.checkOut.getTime(), gridEndExclusive.getTime());

            if (barEndTime <= barStartTime) {
                return;
            }

            const startOffset = Math.max(0, Math.floor((barStartTime - gridStart.getTime()) / msPerDay));
            if (startOffset >= totalDays) {
                return;
            }

            const rawEndOffset = Math.ceil((barEndTime - gridStart.getTime()) / msPerDay);
            const endOffset = Math.max(startOffset, Math.min(totalDays, rawEndOffset));
            const duration = endOffset - startOffset;

            if (duration <= 0) {
                return;
            }

            let laneIndex = 0;
            while (laneEndOffsets[laneIndex] !== undefined && laneEndOffsets[laneIndex] > startOffset) {
                laneIndex += 1;
            }
            laneEndOffsets[laneIndex] = endOffset;

            layoutBookings.push({
                booking,
                startOffset,
                duration,
                laneIndex
            });
        });

        const laneSpacing = 38;
        const barHeight = 30;
        const baseTop = 15; // Center single bookings
        const laneCount = Math.max(1, laneEndOffsets.length);
        const calendarHeight = Math.max(60, baseTop * 2 + barHeight + (laneCount - 1) * laneSpacing);

        let html = '<div class="room-row">';
        html += `<div class="room-name">${this.escapeHtml(this.capitalizeFirstLetter(roomName))}</div>`;
        html += `<div class="room-calendar" style="min-height: ${calendarHeight}px; width: ${trackWidth}px;">`;

        layoutBookings.forEach(({ booking, startOffset, duration, laneIndex }) => {
            const left = startOffset * dayWidth;
            const width = Math.max(0, duration * dayWidth - 4); // -4 for spacing
            const top = baseTop + laneIndex * laneSpacing;

            const guestName = booking.guestName || 'Guest';
            const sanitizedSource = this.sanitizeClassName(booking.source) || 'direct';
            const isSelected = this.selectedBookingId && String(booking.id) === String(this.selectedBookingId);
            const classNames = ['booking-bar', sanitizedSource];
            if (isSelected) {
                classNames.push('selected');
            }

            const tooltipText = `${guestName} (${booking.source || 'direct'})\n${this.formatDate(booking.checkIn)} - ${this.formatDate(booking.checkOut, true)}`;
            const ariaLabel = `${guestName} • ${this.formatDate(booking.checkIn)} to ${this.formatDate(booking.checkOut, true)}`;

            html += `<div class="${classNames.join(' ')}"
                data-booking-id="${this.escapeHtml(String(booking.id))}"
                style="left: ${left}px; width: ${width}px; top: ${top}px;"
                role="button"
                tabindex="0"
                aria-pressed="${isSelected ? 'true' : 'false'}"
                aria-label="${this.escapeHtml(ariaLabel)}"
                title="${this.escapeHtml(tooltipText)}">
                ${this.escapeHtml(guestName)}
            </div>`;
        });

        html += '</div></div>';
        return html;
    }

    handleCalendarClick(event) {
        const bar = event.target.closest('.booking-bar');
        if (!bar || !this.calendarEl || !this.calendarEl.contains(bar)) return;

        const bookingId = bar.getAttribute('data-booking-id');
        if (bookingId) {
            this.selectBookingById(bookingId);
        }
    }

    handleCalendarKeydown(event) {
        const bar = event.target.closest('.booking-bar');
        if (!bar) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const bookingId = bar.getAttribute('data-booking-id');
            if (bookingId) {
                this.selectBookingById(bookingId);
            }
        }
    }

    selectBookingById(bookingId) {
        if (!bookingId) return;

        const booking = this.findBookingById(bookingId);
        if (!booking) return;

        this.selectedBookingId = String(booking.id);
        this.updateSelectedBookingHighlight();
        this.renderBookingDetails();
    }

    findBookingById(bookingId) {
        if (!bookingId) return null;
        return this.bookings.find(booking => String(booking.id) === String(bookingId)) || null;
    }

    updateSelectedBookingHighlight() {
        if (!this.calendarEl) return;

        const bars = this.calendarEl.querySelectorAll('.booking-bar');
        bars.forEach(bar => {
            const isSelected = this.selectedBookingId && String(bar.getAttribute('data-booking-id')) === String(this.selectedBookingId);
            bar.classList.toggle('selected', Boolean(isSelected));
            bar.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });
    }

    renderBookingDetails() {
        if (!this.detailsEl) return;

        if (!this.selectedBookingId) {
            this.detailsEl.classList.add('hidden');
            this.detailsEl.innerHTML = '<p class="booking-details-empty">Select a booking to see guest details.</p>';
            return;
        }

        const booking = this.findBookingById(this.selectedBookingId);
        if (!booking) {
            this.detailsEl.classList.add('hidden');
            this.detailsEl.innerHTML = '<p class="booking-details-empty">Select a booking to see guest details.</p>';
            return;
        }

        const guestName = booking.guestName || 'Guest';
        const bookingReference = this.getBookingReference(booking);
        const phone = this.getPreferredPhone(booking);
        const phoneHref = this.getTelephoneHref(phone);
        const arrival = this.formatFullDate(booking.startDate);
        const departure = this.formatFullDate(booking.endDate);
        const adults = this.getAdultsCount(booking);
        const children = this.getChildrenCount(booking);
        const charges = this.formatChargesEUR(booking);
        const notes = this.getBookingNotes(booking);

        const phoneMarkup = phone
            ? (phoneHref
                ? `<a class="booking-detail-link" href="${this.escapeHtml(phoneHref)}">${this.escapeHtml(phone)}</a>`
                : this.escapeHtml(phone))
            : '<span class="muted">Not provided</span>';

        const bookingIdMarkup = bookingReference
            ? this.escapeHtml(bookingReference)
            : '<span class="muted">Not provided</span>';

        const notesMarkup = notes
            ? this.escapeHtml(notes).replace(/\n/g, '<br>')
            : '<span class="muted">Not provided</span>';

        const detailsHtml = `
            <div class="booking-details-card">
                <div class="booking-details-header">
                    <h2>Guest Details</h2>
                    <div class="booking-details-chip">${this.escapeHtml(this.capitalizeFirstLetter(booking.source || 'direct'))}</div>
                </div>
                <div class="booking-details-grid">
                    <div class="booking-details-row">
                        <span class="booking-detail-label">Name</span>
                        <span class="booking-detail-value">${this.escapeHtml(guestName)}</span>
                    </div>
                    <div class="booking-details-row">
                        <span class="booking-detail-label">Booking ID</span>
                        <span class="booking-detail-value">${bookingIdMarkup}</span>
                    </div>
                    <div class="booking-details-row">
                        <span class="booking-detail-label">Phone</span>
                        <span class="booking-detail-value">${phoneMarkup}</span>
                    </div>
                    <div class="booking-details-row">
                        <span class="booking-detail-label">Check-in</span>
                        <span class="booking-detail-value">${this.escapeHtml(arrival)}</span>
                    </div>
                    <div class="booking-details-row">
                        <span class="booking-detail-label">Check-out</span>
                        <span class="booking-detail-value">${this.escapeHtml(departure)}</span>
                    </div>
                    <div class="booking-details-row">
                        <span class="booking-detail-label">Adults</span>
                        <span class="booking-detail-value">${this.escapeHtml(adults)}</span>
                    </div>
                    <div class="booking-details-row">
                        <span class="booking-detail-label">Children</span>
                        <span class="booking-detail-value">${this.escapeHtml(children)}</span>
                    </div>
                    <div class="booking-details-row">
                        <span class="booking-detail-label">Charges (EUR)</span>
                        <span class="booking-detail-value">${this.escapeHtml(charges)}</span>
                    </div>
                    <div class="booking-details-row booking-details-row-notes">
                        <span class="booking-detail-label">Notes</span>
                        <span class="booking-detail-value booking-detail-notes">${notesMarkup}</span>
                    </div>
                </div>
            </div>
        `;

        this.detailsEl.innerHTML = detailsHtml;
        this.detailsEl.classList.remove('hidden');
    }

    getPreferredPhone(booking) {
        if (!booking) return null;
        const raw = booking.rawData || {};
        const candidates = [booking.phone, raw.mobile, raw.phone, raw.telephone, raw.tel];
        for (const candidate of candidates) {
            if (candidate === undefined || candidate === null) continue;
            const trimmed = String(candidate).trim();
            if (!trimmed || trimmed === '0') continue;
            return trimmed;
        }
        return null;
    }

    getTelephoneHref(phone) {
        if (!phone) return null;
        const normalized = phone.replace(/[^0-9+]/g, '');
        return normalized ? `tel:${normalized}` : null;
    }

    getBookingReference(booking) {
        if (!booking) return null;
        const raw = booking.rawData || {};
        const source = (booking.source || '').toLowerCase();
        const reference = raw.apiReference || raw.reference || raw.id || booking.id;

        if (source.includes('booking') || source.includes('airbnb')) {
            return reference ? String(reference) : null;
        }

        return null;
    }

    getAdultsCount(booking) {
        if (!booking) return 'Not provided';
        const raw = booking.rawData || {};
        const value = booking.numAdult ?? raw.numAdult ?? raw.adults;
        return this.formatCountValue(value);
    }

    getChildrenCount(booking) {
        if (!booking) return 'Not provided';
        const raw = booking.rawData || {};
        const value = booking.numChild ?? raw.numChild ?? raw.children;
        return this.formatCountValue(value);
    }

    formatCountValue(value) {
        if (value === undefined || value === null) {
            return 'Not provided';
        }
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? String(numberValue) : String(value);
    }

    formatChargesEUR(booking) {
        if (!booking) return 'Not provided';
        const raw = booking.rawData || {};
        const amount = Number(booking.price ?? raw.price);

        if (!Number.isFinite(amount)) {
            return 'Not provided';
        }

        try {
            const formatted = new Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: 'EUR'
            }).format(amount);

            const currency = (raw.currency || raw.currencyCode || '').toString().toUpperCase();
            if (currency && currency !== 'EUR') {
                return `${formatted} (${currency})`;
            }

            return formatted;
        } catch (error) {
            return `${amount.toFixed(2)} EUR`;
        }
    }

    formatFullDate(value) {
        const date = this.normalizeDate(value);
        if (!date) return 'Not provided';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getBookingNotes(booking) {
        if (!booking) return null;
        const raw = booking.rawData || {};
        const candidates = [
            booking.notes,
            raw.notes,
            raw.comments,
            raw.message,
            raw.groupNote,
            raw.internalNotes,
            raw.additionalInfo
        ];

        const collected = [];
        candidates.forEach(value => {
            if (value === undefined || value === null) return;
            if (typeof value !== 'string') {
                value = String(value);
            }
            const trimmed = value.trim();
            if (!trimmed) return;
            if (!collected.includes(trimmed)) {
                collected.push(trimmed);
            }
        });

        return collected.length > 0 ? collected.join('\n\n') : null;
    }

    sanitizeClassName(value) {
        if (value === undefined || value === null) return '';
        return value
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '');
    }

    normalizeDate(value) {
        if (!value) return null;
        const date = value instanceof Date ? new Date(value) : new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        return date;
    }
    
    getFilteredBookings() {
        return this.bookings.filter(booking => {
            if (this.filter === 'all') return true;
            return booking.source === this.filter;
        });
    }
    
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    parseIsoDate(value) {
        if (!value) return null;

        if (value instanceof Date) {
            return new Date(value.getTime());
        }

        if (typeof value === 'number') {
            const fromNumber = new Date(value);
            return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
        }

        if (typeof value === 'string') {
            const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                const [, yearStr, monthStr, dayStr] = match;
                const year = Number(yearStr);
                const month = Number(monthStr) - 1;
                const day = Number(dayStr);
                if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
                    // Create at noon UTC to avoid timezone rollovers on mobile browsers.
                    const utcDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
                    return new Date(utcDate.getTime());
                }
            }

            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        return null;
    }

    formatDate(date, isCheckout = false) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
        const adjusted = new Date(date);
        if (isCheckout) {
            // Show the night count by presenting the day before checkout.
            adjusted.setDate(adjusted.getDate() - 1);
        }
        return adjusted.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    showError(message) {
        const calendarEl = document.getElementById('calendar');
        calendarEl.innerHTML = `<div class="error">${message}</div>`;
    }

    getDayWidth() {
        const rootStyles = getComputedStyle(document.documentElement);
        const value = rootStyles.getPropertyValue('--day-width');
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 40;
    }

    getMsPerDay() {
        return 24 * 60 * 60 * 1000;
    }

    getTotalDays(startDate, endDate) {
        const msPerDay = this.getMsPerDay();
        const start = this.normalizeDate(startDate).getTime();
        const end = this.normalizeDate(endDate).getTime();
        return Math.floor((end - start) / msPerDay) + 1;
    }

    renderMonthLabels(startDate, endDate) {
        const msPerDay = this.getMsPerDay();
        const dayWidth = this.getDayWidth();
        const totalDays = this.getTotalDays(startDate, endDate);
        const trackWidth = totalDays * dayWidth;

        const labels = [];
        const monthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

        while (monthCursor <= endDate) {
            const labelDate = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 14);
            if (labelDate < startDate) {
                labelDate.setTime(startDate.getTime());
            }
            if (labelDate > endDate) {
                labelDate.setTime(endDate.getTime());
            }

            const offsetDays = Math.round((this.normalizeDate(labelDate) - this.normalizeDate(startDate)) / msPerDay);
            const left = offsetDays * dayWidth;
            const labelText = labelDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            labels.push({ text: labelText, left });
            monthCursor.setMonth(monthCursor.getMonth() + 1);
        }

        let html = '<div class="month-labels">';
        html += '<div class="month-label-spacer"></div>';
        html += `<div class="month-label-track" style="width: ${trackWidth}px;">`;
        labels.forEach(label => {
            html += `<div class="month-label" style="left: ${label.left}px;">${this.escapeHtml(label.text)}</div>`;
        });
        html += '</div></div>';
        return html;
    }

    handleViewportChange() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.renderCalendar();
        }, 150);
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BookingCalendar();
});
