import { UsersAdmin } from "@/features/admin/users-admin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Users</h1>
      <p className="mb-4 text-sm text-muted">
        Edit any member&apos;s points, package (BridgeMaker / BridgeMaster), role and
        profile, or block / delete accounts. Every change is recorded in the admin log.
      </p>
      <UsersAdmin />
    </div>
  );
}
