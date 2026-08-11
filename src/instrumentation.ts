// Runs once when the server process starts. On the long-running Railway server
// this schedules the daily membership maintenance (expiry + renewal reminders).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runMembershipMaintenance } = await import(
    "@/features/membership/jobs"
  );

  const run = () => void runMembershipMaintenance();
  // Run shortly after boot, then once a day.
  setTimeout(run, 30_000);
  setInterval(run, 24 * 60 * 60 * 1000);
}
