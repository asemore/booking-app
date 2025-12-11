# booking-app

A booking calendar app showing Airbnb and Booking.com reservations fetched from Beds24 API.

## Features

### Calendar Display
- Monthly calendar view with horizontal scrolling for dates
- Color-coded booking bars spanning across dates:
  - 🔴 Red/pink bars for Airbnb reservations
  - 🔵 Blue bars for Booking.com reservations
- Guest names displayed on booking bars
- Room names displayed on the left side of each row

### Room Management
- Three predefined rooms: Jason, Smile, and Maria
- Multi-room layout showing all rooms simultaneously

### Data Integration
- Fetches bookings from **Beds24 API** (https://api.beds24.com)
- Parses data to extract booking information including:
  - Guest names
  - Check-in/check-out dates
  - Booking source (Airbnb, Booking.com, etc.)
  - Room assignments
- Real data is used when API credentials are configured
- Falls back to sample data for testing when credentials are not available

### Navigation and Filtering
- **Month navigation**: Previous/next month buttons
- **Date picker**: Jump to specific months
- **Filters dropdown**: Filter by booking source (All, Airbnb only, Booking.com only)

### Mobile Optimization
- Responsive design optimized for mobile devices
- Touch-friendly interface elements
- Horizontal scrolling for calendar dates
- Clean, intuitive layout

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js with Express
- **API Integration**: Beds24 REST API
- **Dependencies**:
  - express: Web server framework
  - cors: CORS middleware
  - node-fetch: HTTP client for fetching data from APIs

## Installation

1. Clone the repository:
```bash
git clone https://github.com/asemore/booking-app.git
cd booking-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file at the project root and add your Beds24 credentials. Example:
```
BEDS24_API_TOKEN=your_long_api_token
JASON_PROPERTY_ID=298408
JASON_ROOM_ID=623204
SMILE_PROPERTY_ID=298409
SMILE_ROOM_ID=623205
MARIA_PROPERTY_ID=298407
MARIA_ROOM_ID=623203
PORT=3000
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. The calendar will automatically load bookings from Beds24 API

### Using Sample Data (No API Credentials)

If you don't have Beds24 API credentials, the app will automatically generate sample booking data for testing purposes. You'll see a note in the console indicating this.

## Development

For development with auto-reload, use a tool like `nodemon` locally.

## API Endpoints

### Get All Bookings
```
GET /api/bookings
```
Returns all bookings for all rooms.

**Response:**
```json
{
  "success": true,
  "bookings": [...],
  "rooms": ["jason", "smile", "maria"],
  "dataSource": "beds24"
}
```

### Get Room Bookings
```
GET /api/bookings/:room
```
Returns bookings for a specific room (jason, smile, or maria).

**Response:**
```json
{
  "success": true,
  "bookings": [...],
  "room": "jason",
  "dataSource": "beds24"
}
```

## Project Structure

```
booking-app/
├── public/
│   ├── index.html      # Main HTML page
│   ├── styles.css      # Responsive CSS styles
│   └── app.js          # Frontend JavaScript
├── server.js           # Express server
├── beds24API.js        # Beds24 API integration
├── icsParser.js        # ICS parser (legacy support)
├── package.json        # Project dependencies
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore file
└── README.md           # This file
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BEDS24_API_TOKEN` | Yes* | Beds24 API v2 token |
| `JASON_PROPERTY_ID` | Yes* | Beds24 property Id for Jason |
| `JASON_ROOM_ID` | Yes* | Beds24 room Id for Jason |
| `SMILE_PROPERTY_ID` | Yes* | Beds24 property Id for Smile |
| `SMILE_ROOM_ID` | Yes* | Beds24 room Id for Smile |
| `MARIA_PROPERTY_ID` | Yes* | Beds24 property Id for Maria |
| `MARIA_ROOM_ID` | Yes* | Beds24 room Id for Maria |
| `PORT` | No | Server port (default: 3000) |

*If no credentials are provided the app falls back to generated sample data.

## Deploying to rent.vivid.toys (cPanel)

1. In your hosting panel create the subdomain `rent.vivid.toys` and point it to `public_html/rent`.
2. Upload this repository under `public_html/rent` (e.g. via SFTP or the file manager) and run `npm install` inside that directory.
3. Create a `.env` file in the same folder with the production Beds24 credentials and the `PORT` assigned by your hosting provider.
4. From the hosting panel start a Node.js application that points to `public_html/rent`, set the startup file to `server.js`, and set the environment variables from the `.env` file (or load them with `dotenv`).
5. Launch the app (for example with `npm start` or `pm2 start server.js`). The Express server serves both the `/api` routes and the static front-end at `rent.vivid.toys`.
6. If your provider uses a reverse proxy, ensure the assigned external port is open and mapped to the Node.js process.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

ISC

