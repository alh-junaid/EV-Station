import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

export function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
  return (
    <Card className="p-6" data-testid="card-stats">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1" data-testid="text-stats-title">
            {title}
          </p>
          <p className="text-3xl font-bold tabular-nums" data-testid="text-stats-value">
            {value}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-stats-desc">
              {description}
            </p>
          )}
        </div>
        <div className="rounded-md bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </Card>
  );
}
