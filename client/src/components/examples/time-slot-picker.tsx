import { TimeSlotPicker } from '../time-slot-picker';
import { useState } from 'react';

export default function TimeSlotPickerExample() {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const slots = [
    { time: "08:00", available: true },
    { time: "10:00", available: true },
    { time: "12:00", available: false },
    { time: "14:00", available: true },
    { time: "16:00", available: true },
    { time: "18:00", available: false },
  ];

  return (
    <div className="max-w-2xl">
      <TimeSlotPicker
        slots={slots}
        selectedSlot={selectedSlot}
        onSelectSlot={setSelectedSlot}
      />
    </div>
  );
}
