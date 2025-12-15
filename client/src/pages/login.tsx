import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const { login, register, user } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegister) {
        if (!email || !password || !name) {
          alert("Please fill in all required fields.");
          return;
        }
        await register.mutateAsync({ email, password, name, carModel, carNumber });
      } else {
        if (!email || !password) {
          alert("Please enter email and password.");
          return;
        }
        await login.mutateAsync({ email, password });
      }
      setLocation("/");
    } catch (err: any) {
      // Check for "User not found" error
      const message = err?.message || "";
      if (message.includes("User not found") || message.includes("404")) {
        // You could also automatically switch to register mode:
        // setIsRegister(true);
        // But user asked for a message.
        // The useAuth hook already shows a toast.
        // Let's add a visible message on the form too or rely on the toast.
        // Given the user request, I'll make it very explicit.
        alert("Account does not exist. Please register."); // Simple and effective for "it has to say"
        setIsRegister(true); // Help the user by switching to register
      }
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-card p-6 rounded-md">
        <h2 className="text-2xl font-bold mb-4">{isRegister ? "Register" : "Login"}</h2>
        {isRegister && (
          <div className="mb-3">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        {isRegister && (
          <div className="mb-3">
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
            <p className="text-muted text-xs mt-1">Suggestions shown to help typing — pick or type your model.</p>
          </div>
        )}
        {isRegister && (
          <div className="mb-3">
            <Label htmlFor="carNumber">Car number</Label>
            <Input id="carNumber" value={carNumber} onChange={(e) => setCarNumber(e.target.value)} placeholder="e.g. MH12AB1234" />
            <p className="text-muted text-xs mt-1">Enter your vehicle registration number (for pre-filling bookings).</p>
          </div>
        )}
        <div className="mb-3">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-3">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Button type="submit">{isRegister ? "Register" : "Login"}</Button>
          <Button type="button" variant="ghost" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Have an account? Login" : "Create account"}
          </Button>
        </div>
      </form>
    </div>
  );
}
