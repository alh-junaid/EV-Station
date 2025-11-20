import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setCarModel((user as any).carModel ?? "");
      setCarNumber((user as any).carNumber ?? "");
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest('PATCH', '/api/me', { name, carModel, carNumber });
      const contentType = res.headers.get('content-type') || '';
      let updated: any = null;
      if (contentType.includes('application/json')) {
        updated = await res.json();
      } else {
        // If server returned HTML (e.g. dev overlay) or plain text, show it to the user
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 200)}`);
      }

      // Update /api/me cache so UI reflects changes immediately
      queryClient.setQueryData(["/api/me"], { user: updated });
      toast({ title: 'Profile updated', description: 'Your profile has been saved.' });
      setLocation('/');
    } catch (err: any) {
      // If the error contains HTML (common when dev server returns index.html or overlay), show a short message
      const msg = err?.message || 'Failed to update profile';
      const isHtml = typeof msg === 'string' && msg.trim().startsWith('<');
      toast({ title: 'Update failed', description: isHtml ? 'Server returned HTML error — check server console' : msg });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Please login to edit your profile.</p>
          <div className="mt-4">
            <Button onClick={() => setLocation('/login')}>Login</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="carModel">Car model</Label>
            <Input list="car-models" id="carModel" value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="e.g. Tesla Model 3" />
            <datalist id="car-models">
              <option value="Tesla Model 3" />
              <option value="Tesla Model Y" />
              <option value="Nissan Leaf" />
              <option value="Hyundai Kona Electric" />
              <option value="MG ZS EV" />
              <option value="Tata Nexon EV" />
            </datalist>
          </div>

          <div>
            <Label htmlFor="carNumber">Car number</Label>
            <Input id="carNumber" value={carNumber} onChange={(e) => setCarNumber(e.target.value)} placeholder="e.g. MH12AB1234" />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            <Button variant="ghost" onClick={() => setLocation('/')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
