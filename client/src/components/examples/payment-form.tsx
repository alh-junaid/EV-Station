import { PaymentForm } from '../payment-form';

export default function PaymentFormExample() {
  return (
    <div className="max-w-md">
      <PaymentForm
        amount={30.80}
        onSubmit={() => console.log('Payment submitted')}
      />
    </div>
  );
}
