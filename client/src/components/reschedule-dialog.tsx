import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { TimeSlotPicker } from "@/components/time-slot-picker";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface RescheduleDialogProps {
    bookingId: string | null;
    stationId: number;
    currentDate: Date;
    currentTime: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function RescheduleDialog({
    bookingId,
    stationId,
    currentDate: initialDate,
    currentTime: initialTime,
    open,
    onOpenChange
}: RescheduleDialogProps) {
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(initialDate);
    const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (open) {
            setSelectedDate(initialDate);
            setSelectedSlot(null); // Reset slot selection on open
        }
    }, [open, initialDate]);

    // Fetch availability for the selected date
    const { data: availabilityData, isLoading: isLoadingAvailability } = useQuery({
        queryKey: ["/api/stations", stationId, "availability", selectedDate?.toISOString()],
        queryFn: async () => {
            if (!selectedDate) return { bookedSlots: [] };
            const dateStr = selectedDate.toISOString().split('T')[0];
            const res = await fetch(`/api/stations/${stationId}/availability?date=${dateStr}`);
            if (!res.ok) throw new Error("Failed to fetch availability");
            return res.json();
        },
        enabled: !!selectedDate && open && stationId > 0,
    });

    const rescheduleMutation = useMutation({
        mutationFn: async () => {
            if (!bookingId || !selectedDate || !selectedSlot) return;
            const res = await apiRequest("PATCH", `/api/bookings/${bookingId}/reschedule`, {
                date: selectedDate.toISOString(),
                startTime: selectedSlot
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
            toast({
                title: "Booking Rescheduled",
                description: `Your booking has been moved to ${selectedDate ? format(selectedDate, 'MMM dd') : ''} at ${selectedSlot}.`,
            });
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast({
                title: "Reschedule Failed",
                description: err.message || "Could not reschedule booking. Slot might be taken.",
                variant: "destructive",
            });
        },
    });

    // Calculate slots
    const allTimeSlots = Array.from({ length: 12 }, (_, i) => {
        const hour = i * 2;
        return {
            time: `${hour.toString().padStart(2, '0')}:00`,
            available: true
        };
    });

    const bookedSlots = availabilityData?.bookedSlots || [];
    const timeSlots = allTimeSlots.map(slot => ({
        ...slot,
        available: !bookedSlots.includes(slot.time) || (
            // If staying on same day, original slot technically shows as booked by US.
            // But for UI simplicity, if we select same day/time, it doesn't matter much 
            // as "Reschedule" implies changing it. 
            // However, to allow re-selecting the original time (if user changes mind mid-edit but hasn't saved),
            // we'd need to know if this slot is OUR booking.
            // But availability API just returns list of strings.
            // We'll let it show as unavailable if it's booked (even by us).
            // This forces user to pick a DIFFERENT slot, which is fine for "Reschedule".
            // Exception: If new date != initial Date, then all booked slots are definitely blocked.
            // If new date == initial Date, the initialTime IS booked.
            // So effectively, we can't select our current slot again unless we filter it out from bookedSlots.
            // We don't have enough info here to filter it out easily without fetching booking details again.
            // We will accept "Reschedule means CHANGE time".
            true
        ) && !bookedSlots.includes(slot.time),
    }));

    const isSameTime = selectedDate?.toDateString() === initialDate.toDateString() && selectedSlot === initialTime;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Reschedule Booking</DialogTitle>
                    <DialogDescription>
                        Select a new date and time for your appointment.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid md:grid-cols-2 gap-6 py-4">
                    <div className="flex justify-center border-r pr-6">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            className="rounded-md border"
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                    </div>
                    <div>
                        <h4 className="mb-4 font-medium leading-none">Available Slots</h4>
                        {isLoadingAvailability ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : selectedDate ? (
                            <div className="grid grid-cols-3 gap-2">
                                {timeSlots.map((slot) => (
                                    <Button
                                        key={slot.time}
                                        variant={selectedSlot === slot.time ? "default" : "outline"}
                                        disabled={!slot.available}
                                        onClick={() => !(!slot.available) && setSelectedSlot(slot.time)}
                                        className="w-full text-xs"
                                    >
                                        {slot.time}
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted-foreground text-sm">Please select a date first.</div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={() => rescheduleMutation.mutate()}
                        disabled={!selectedSlot || !selectedDate || isSameTime || rescheduleMutation.isPending}
                    >
                        {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Reschedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
