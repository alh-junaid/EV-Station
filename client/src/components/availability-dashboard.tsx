import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface AvailabilitySummary {
    id: number;
    name: string;
    location: string;
    totalSlots: number;
    bookedSlots: number;
    status: string;
}

export function AvailabilityDashboard() {
    const [date, setDate] = useState<Date>(new Date());

    const { data: summary, isLoading } = useQuery<AvailabilitySummary[]>({
        queryKey: ["/api/stations/availability/summary", date.toISOString()],
        queryFn: async () => {
            const dateStr = date.toISOString().split('T')[0];
            const res = await fetch(`/api/stations/availability/summary?date=${dateStr}`);
            if (!res.ok) throw new Error("Failed to fetch summary");
            return res.json();
        },
    });

    return (
        <Card className="p-6 w-full max-w-4xl mx-auto mt-8 relative z-20 shadow-xl border-primary/20">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">Station Availability</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden md:inline">Check availability for:</span>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={`w-[240px] justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                                initialFocus
                                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Station Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">Booked Slots</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Loading availability...
                                </TableCell>
                            </TableRow>
                        ) : summary?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No stations found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            summary?.map((station) => (
                                <TableRow key={station.id}>
                                    <TableCell className="font-medium">{station.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{station.location}</TableCell>
                                    <TableCell className="text-right">
                                        {station.bookedSlots} / {station.totalSlots}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                          ${station.status === 'High Availability' ? 'bg-green-100 text-green-800' :
                                                station.status === 'Medium Availability' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'}`}>
                                            {station.status}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}
