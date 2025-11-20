import { BookingCard } from '../booking-card';

export default function BookingCardExample() {
  return (
    <div className="max-w-2xl">
      <BookingCard
        id="1"
        stationName="Downtown Power Hub"
        location="123 Main St, San Francisco"
        date={new Date(2025, 11, 20)}
        startTime="14:00"
        duration={2}
        chargerType="DC Fast Charger"
        status="upcoming"
        totalCost={28.50}
        onCancel={() => console.log('Cancel booking clicked')}
      />
    </div>
  );
}
