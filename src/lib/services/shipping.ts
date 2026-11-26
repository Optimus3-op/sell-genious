export interface ShippingRateOption {
  id: string;
  name: string;
  estimatedDays: string;
  costCents: number;
  carrier: string;
}

/**
 * Modular shipping rate calculator. Free Express above $150, otherwise Standard Ground ($12) or Express ($22).
 */
export function calculateShippingOptions(subtotalCents: number): ShippingRateOption[] {
  const qualifiesFree = subtotalCents >= 15000;
  return [
    {
      id: "standard",
      name: qualifiesFree ? "Free Express Shipping ($150+)" : "Standard Ground",
      estimatedDays: qualifiesFree ? "2–3 business days" : "4–6 business days",
      costCents: qualifiesFree ? 0 : 1200,
      carrier: "SellGenius Modular Carrier",
    },
    {
      id: "priority",
      name: "Priority Air Express",
      estimatedDays: "1–2 business days",
      costCents: 2200,
      carrier: "SellGenius Modular Carrier",
    },
  ];
}
