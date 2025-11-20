import { StatsCard } from '../stats-card';
import { Zap } from 'lucide-react';

export default function StatsCardExample() {
  return (
    <div className="max-w-sm">
      <StatsCard
        title="Total Sessions"
        value={24}
        icon={Zap}
        description="This month"
      />
    </div>
  );
}
