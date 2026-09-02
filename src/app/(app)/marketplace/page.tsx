import { redirect } from "next/navigation";

// Marketplace was rebranded to Business Opportunities (/opportunities).
export default function MarketplacePage() {
  redirect("/opportunities");
}