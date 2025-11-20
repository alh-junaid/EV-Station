import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelectSlot: (time: string) => void;
}

export function TimeSlotPicker({ slots, selectedSlot, onSelectSlot }: TimeSlotPickerProps) {
  return (
    <Card className="p-6" data-testid="card-time-slots">
      <h3 className="font-semibold text-lg mb-4">Select Time Slot</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {slots.map((slot) => (
          <Button
            key={slot.time}
            variant={selectedSlot === slot.time ? "default" : "outline"}
            disabled={!slot.available}
            onClick={() => slot.available && onSelectSlot(slot.time)}
            className="w-full"
            data-testid={`button-slot-${slot.time}`}
          >
            {slot.time}
          </Button>
        ))}
      </div>
    </Card>
  );
}
