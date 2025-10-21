# Walk-In Clinics BC

A web application to display walk-in clinics in British Columbia with real-time availability and booking information on an interactive map.

## Features

- 🗺️ **Interactive Map**: View all walk-in clinics on a map of BC
- 🏥 **Clinic Information**: See clinic details including address, phone, hours, and website
- ⚡ **Real Walk-In Highlighting**: Special markers for clinics that don't require advance booking
- 📅 **Time Slot Display**: Shows next available booking time for clinics that require appointments
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Clean interface with Tailwind CSS

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Leaflet** - Interactive maps
- **React-Leaflet** - React components for Leaflet
- **Tailwind CSS** - Styling

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/woodsxwu/WalkInNow.git
cd WalkInNow
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
WalkInNow/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main page with map and sidebar
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   └── MapComponent.tsx    # Map component with markers
│   ├── types/
│   │   └── clinic.ts           # TypeScript types
│   └── lib/
│       └── api.ts              # API helper functions
├── public/                      # Static files
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## Integrating Your API

### Step 1: Set Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_API_URL=https://your-api-endpoint.com/api
```

### Step 2: Update API Integration

The API helper functions are in `src/lib/api.ts`. Once you have your actual API endpoint:

1. **For fetching all clinics**, your API should return an array matching this structure:

```typescript
[
  {
    "id": "clinic-1",
    "name": "Vancouver Medical Clinic",
    "address": "123 Main St, Vancouver, BC",
    "latitude": 49.2827,
    "longitude": -123.1207,
    "website": "https://example.com",
    "phone": "604-555-0100",
    "isRealWalkIn": true,
    "hours": "Mon-Fri 8am-8pm"
  }
]
```

2. **For fetching time slots**, your API endpoint should accept a clinic ID and return:

```typescript
{
  "clinicId": "clinic-1",
  "nextAvailableSlot": "2025-10-20T14:30:00" // ISO date string or null
}
```

### Step 3: Update the Main Page

In `src/app/page.tsx`, replace the sample data with actual API calls:

```typescript
useEffect(() => {
  async function loadClinics() {
    try {
      setLoading(true)
      // Fetch clinics from your API
      const clinicsData = await fetchClinics()
      
      // If clinics require booking, fetch time slots
      const bookingRequired = clinicsData.filter(c => !c.isRealWalkIn)
      if (bookingRequired.length > 0) {
        const timeSlots = await fetchTimeSlots(bookingRequired.map(c => c.id))
        const mergedClinics = mergeClinicsWithTimeSlots(clinicsData, timeSlots)
        setClinics(mergedClinics)
      } else {
        setClinics(clinicsData)
      }
    } catch (error) {
      console.error('Failed to load clinics:', error)
      // Handle error (show error message to user)
    } finally {
      setLoading(false)
    }
  }

  loadClinics()
}, [])
```

## Customization

### Changing Colors

Edit `tailwind.config.js` to customize the color scheme:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',    // Main brand color
      secondary: '#your-color',  // Real walk-in marker color
    },
  },
}
```

### Marker Styles

Customize map markers in `src/components/MapComponent.tsx` in the `createCustomIcon` function.

### Map Center and Zoom

Change the default map view in `MapComponent.tsx`:

```typescript
const center: [number, number] = [49.2827, -123.1207] // [latitude, longitude]
// And in MapContainer:
zoom={10} // Adjust zoom level (1-20)
```

## API Requirements

Your API should provide:

1. **GET /api/clinics** - List all clinics
2. **GET /api/timeslots/:clinicId** - Get next available time slot for a clinic

Optional endpoints you might want to add:
- **GET /api/clinics/:id** - Get single clinic details
- **POST /api/clinics/search** - Search clinics by location or name
- **GET /api/clinics/nearby?lat=X&lng=Y** - Get nearby clinics

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables
5. Deploy!

### Build for Production

```bash
npm run build
npm start
```

## Current Status

✅ Basic project structure set up
✅ Interactive map with Leaflet
✅ Clinic markers with custom icons
✅ Sidebar with clinic list and details
✅ Real walk-in highlighting
✅ Time slot display support
✅ Responsive design
⏳ API integration (waiting for your API endpoint)

## Next Steps

1. **Provide your API endpoint** for time slot queries
2. **Test the API integration** with real data
3. **Add more clinics** to the database
4. **Optional enhancements**:
   - Add search/filter functionality
   - Add user location detection
   - Add directions to clinics
   - Add favorites/bookmarking
   - Add real-time updates

## License

MIT

## Contact

For questions or issues, please open an issue on GitHub.
