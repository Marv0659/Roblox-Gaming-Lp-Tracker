import Link from "next/link";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const isConfig = error === "Configuration";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold text-zinc-100">
          {isConfig ? "Sign-in not configured" : "Access denied"}
        </h1>
        <p className="mb-6 text-sm text-zinc-400">
          {isConfig
            ? "Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET to .env for Google sign-in, or use the dev login (any email + password “dev”) on the sign-in page."
            : "Your account is not on the allowed list. Contact the admin to get access."}
        </p>
        <Link
          href="/auth/signin"
          className="inline-block rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
