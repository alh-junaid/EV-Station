import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a currency amount using the Indian Rupee symbol by default.
 * Uses Intl.NumberFormat so this will respect locales.
 */
export function formatCurrency(amount: number, currency = "INR", locale = "en-IN") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch (e) {
    // Fallback — prefix with rupee symbol
    return `₹${amount.toFixed(2)}`;
  }
}
