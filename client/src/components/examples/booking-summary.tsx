import { BookingSummary } from '../booking-summary';

export default function BookingSummaryExample() {
  return (
    <div className="max-w-md">
      <BookingSummary
        stationName="Downtown Power Hub"
        location="123 Main St, San Francisco"
        date={new Date(2025, 11, 20)}
        timeSlot="14:00"
        duration={2}
        chargerType="DC Fast Charger"
        pricePerKwh={0.35}
        estimatedKwh={80}
      />
    </div>
  );
}
