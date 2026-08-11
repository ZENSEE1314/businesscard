import Link from "next/link";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";

const DOCS: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of Service",
    body: [
      "These placeholder Terms of Service govern your use of the platform. Please review with qualified legal counsel before production launch — this copy is a template, not legal advice.",
      "By using the service you agree to use it lawfully, not to abuse the points or rewards systems, and not to post harmful, illegal, or infringing content.",
      "Accounts that violate these terms may be suspended or removed at the platform's discretion.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "This placeholder Privacy Policy describes how we handle your data. Replace with a jurisdiction-specific policy reviewed by legal counsel before launch.",
      "We collect the information you provide (profile details, business information) and basic usage analytics to operate the service.",
      "Only profile information you explicitly mark as public is shared on your public name card. You can edit privacy settings at any time.",
    ],
  },
  guidelines: {
    title: "Community Guidelines",
    body: [
      "Be respectful. No harassment, scams, spam, or illegal content.",
      "Report content that breaks these rules using the report button.",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const content = DOCS[doc];
  if (!content) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-primary">
        ← {env.appName}
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{content.title}</h1>
      <div className="mt-6 space-y-4 text-muted">
        {content.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <p className="mt-8 text-xs text-muted-2">
        Placeholder content for review. Not legal advice.
      </p>
    </main>
  );
}
