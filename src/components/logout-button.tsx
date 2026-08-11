"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { Button } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <Button variant="outline" size="sm" onClick={logout}>
      <LogOut className="h-4 w-4" /> Log out
    </Button>
  );
}
