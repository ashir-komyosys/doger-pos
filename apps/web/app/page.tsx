"use client";

import { AuthRedirectGate } from "@/components/marketing/auth-redirect-gate";
import { RestaurantLanding } from "@/components/marketing/restaurant-landing";

export default function MarketingHomePage() {
  return (
    <div className="h-screen">
      <AuthRedirectGate />
      <RestaurantLanding />
    </div>
  );
}
