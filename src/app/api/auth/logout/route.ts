import { getCurrentUser } from "@/lib/auth/current-user";
import { revokeSession, clearSessionCookie } from "@/lib/auth/session";
import { handle, ok } from "@/lib/api";

export async function POST() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (user) {
      await revokeSession(user.sessionId);
    }
    await clearSessionCookie();
    return ok({ loggedOut: true });
  });
}
