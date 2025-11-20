import { StationCard } from '../station-card';
import heroImage from '@assets/generated_images/Hero_EV_charging_station_08667777.png';

export default function StationCardExample() {
  return (
    <div className="max-w-sm">
      <StationCard
        id={1}
        name="Downtown Power Hub"
        location="123 Main St, San Francisco"
        image={heroImage}
        chargerTypes={["Level 2", "DC Fast"]}
        pricePerKwh={0.35}
        availability="available"
        distance="2.5 miles away"
        onBook={() => console.log('Book station clicked')}
      />
    </div>
  );
}
