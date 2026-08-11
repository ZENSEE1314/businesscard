import { getCurrentUser } from "@/lib/auth/current-user";
import { handle, ok } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    return ok({ user });
  });
}
