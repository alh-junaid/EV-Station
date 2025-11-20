# EV Charging Station Booking Platform - Design Guidelines

## Design Approach

**Hybrid Approach**: Drawing inspiration from Tesla's clean aesthetic and Airbnb's booking patterns, implemented with Material Design principles for consistency and accessibility. The focus is on clarity, efficiency, and trust in the booking process.

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts) - clean, modern, excellent readability
- **Headings**: 
  - H1: 48px (3xl), font-weight 700
  - H2: 36px (2xl), font-weight 600
  - H3: 24px (xl), font-weight 600
- **Body Text**: 16px (base), font-weight 400, line-height 1.6
- **UI Elements**: 14px (sm), font-weight 500
- **Accent Numbers** (pricing, power output): 20px (lg), font-weight 700, tabular-nums

### Layout System
**Tailwind spacing primitives**: 2, 4, 6, 8, 12, 16, 20, 24
- Card padding: p-6
- Section padding: py-16 (desktop), py-12 (mobile)
- Element spacing: gap-4, gap-6, gap-8
- Container: max-w-7xl with px-6

### Component Library

**Station Cards**
- Elevated cards with subtle shadow
- 2-column grid (desktop), single column (mobile)
- Include: station image, name, location, charger types (icons), price/kWh, availability badge
- Hover state: slight elevation increase

**Calendar/Time Slot Selector**
- Full-width calendar grid
- Available slots: outlined style with green accent
- Booked slots: disabled state with reduced opacity
- Selected slot: filled with primary accent
- Time displayed in 24h or 12h format with AM/PM

**Booking Flow Cards**
- Multi-step progress indicator at top
- Steps: Station → Time → Payment → Confirmation
- Each step in dedicated card with clear CTAs

**Payment Interface**
- Stripe-integrated payment form
- Wallet balance display with recharge CTA
- Transaction summary sidebar: station details, time, duration, total cost
- Security badge indicators

**Dashboard Components**
- Upcoming bookings: timeline-style list with station thumbnails
- Past bookings: grid cards with receipt download
- Quick filters: Active, Completed, Cancelled

**Navigation**
- Fixed header with transparent-to-solid scroll behavior
- Logo left, main nav center, user menu right
- Mobile: hamburger menu with slide-out drawer

## Page-Specific Layouts

### Landing/Home Page
- **Hero Section** (80vh): Large background image of EV charging at modern station, blurred button backgrounds for "Find Stations" and "How It Works"
- **Features Section** (3-column grid): Fast Booking, Multiple Payment Options, Real-time Availability
- **How It Works** (4-step horizontal flow with icons)
- **Popular Stations** (carousel or 3-card grid)
- **CTA Section**: "Start Charging Smarter Today" with app download badges

### Station Listing Page
- Filter sidebar (desktop) or drawer (mobile): Location, Charger Type (Level 2, DC Fast), Price Range, Availability
- Map view toggle option
- Station cards in responsive grid
- Load more or infinite scroll

### Station Detail Page
- Hero image gallery (3-5 images)
- Left column (2/3 width): Station details, amenities icons, charger specifications table
- Right column (1/3 width): Sticky booking widget with calendar picker and CTA

### Booking Management Dashboard
- Tab navigation: Upcoming, Past, Cancelled
- Summary stats cards: Total Sessions, kWh Charged, Amount Spent
- Downloadable receipts for each booking

## Images

**Hero Image**: Modern EV charging station with sleek electric car plugged in, preferably during golden hour or blue hour for aesthetic appeal. Clean, professional photography.

**Station Cards/Gallery**: High-quality photos of actual charging stations showing:
- Wide shot of station location
- Close-up of charging connector
- Parking area view
- Amenities (if applicable - covered parking, waiting area)

**Feature Icons**: Use Heroicons for consistency - Lightning Bolt (charging), Calendar (booking), CreditCard (payment), MapPin (location)

## Special Considerations

**Trust Signals**
- Display total active stations number in header
- Show recent booking activity ticker
- Include security badges near payment forms
- Verified station badges

**Status Indicators**
- Green dot: Available now
- Yellow dot: Limited availability
- Red dot: Fully booked
- Gray: Offline/maintenance

**Mobile-First Booking Flow**
Streamlined single-column layout with large touch targets (min 44px height), bottom-sheet style modals for filters and time selection

**Accessibility**
- Calendar keyboard navigation
- Clear focus states on all interactive elements
- ARIA labels for icon-only buttons
- Color contrast ratio minimum 4.5:1 for all text

This design creates a trustworthy, efficient booking experience that emphasizes speed and clarity while maintaining the modern, sustainable aesthetic appropriate for EV technology.