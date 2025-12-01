import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Lock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

interface PaymentFormProps {
  amount: number;
  onSubmit: (paymentIntentId: string) => void;
  disabled?: boolean;
}

export function PaymentForm({ amount, onSubmit, disabled = false }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict validation for demo
    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard !== "4242424242424242") {
      alert("Demo Mode: Please use the exact test card number: 4242 4242 4242 4242");
      return;
    }

    setProcessing(true);

    // For demo purposes, we'll simulate a successful payment
    // In production, this would use Stripe Elements to securely collect and tokenize card data
    setTimeout(() => {
      setProcessing(false);
      // Pass a demo payment intent ID (in production this would come from Stripe)
      onSubmit("demo_payment_intent_" + Date.now());
    }, 1500);
  };

  return (
    <Card className="p-6" data-testid="card-payment">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Payment Details</h3>
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        <strong>Demo card (use for testing):</strong>
        <ul className="pl-4 list-disc mt-2">
          <li>Visa: `4242 4242 4242 4242` — any future expiry — CVC `123`</li>
          <li>Decline card (test): `4000 0000 0000 0002` — will be declined</li>
          <li>Use test emails and dummy data for demo</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="card-number">Card Number</Label>
          <Input
            id="card-number"
            type="text"
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            data-testid="input-card-number"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input
              id="expiry"
              type="text"
              placeholder="MM/YY"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              data-testid="input-expiry"
              required
            />
          </div>
          <div>
            <Label htmlFor="cvv">CVV</Label>
            <Input
              id="cvv"
              type="text"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              data-testid="input-cvv"
              required
            />
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>Your payment information is secure and encrypted</span>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={processing || disabled}
          data-testid="button-pay"
        >
          {processing ? "Processing..." : `Pay ${formatCurrency(amount)}`}
        </Button>
      </form>
    </Card>
  );
}
