export interface PaymentIntentResult {
  provider: "sandbox_simulated" | "stripe_future" | "razorpay_future";
  status: "simulated_captured" | "pending";
  referenceCode: string;
  isSimulated: boolean;
  notice: string;
}

export interface PaymentAdapter {
  readonly id: string;
  readonly label: string;
  readonly isLive: boolean;
  processCheckout(amountCents: number, orderNumber: string): Promise<PaymentIntentResult>;
}

/**
 * MVP Sandbox Payment Adapter.
 * Clearly marks all payments as simulated — never claims a real card/bank charge occurred.
 */
export const sandboxPaymentAdapter: PaymentAdapter = {
  id: "sandbox_simulated",
  label: "SellGenius Sandbox Simulated Checkout",
  isLive: false,
  async processCheckout(_amountCents: number, orderNumber: string): Promise<PaymentIntentResult> {
    return {
      provider: "sandbox_simulated",
      status: "simulated_captured",
      referenceCode: `SIM-${orderNumber}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      isSimulated: true,
      notice: "Simulated sandbox checkout completed. No real payment was charged.",
    };
  },
};

export function getPaymentGatewayStatus() {
  return {
    activeProvider: "sandbox_simulated",
    providers: [
      {
        id: "sandbox_simulated",
        name: "Sandbox Simulated Checkout (MVP Active)",
        configured: true,
        isLive: false,
        description: "Creates verified simulated payment records for end-to-end storefront testing without charging cards.",
      },
      {
        id: "stripe",
        name: "Stripe (Modular Future Adapter)",
        configured: Boolean(process.env.STRIPE_SECRET_KEY),
        isLive: false,
        description: "Plug in STRIPE_SECRET_KEY in a later phase to activate live card & Apple Pay settlements.",
      },
      {
        id: "razorpay",
        name: "Razorpay (Modular Future Adapter)",
        configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        isLive: false,
        description: "Plug in RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in a later phase to activate UPI, netbanking, and cards.",
      },
    ],
  };
}
