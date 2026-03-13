import { auth } from "@/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="p-6 md:p-8">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Settings</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <h2 className="text-lg font-semibold">Your account</h2>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {session?.user?.email ?? "Not signed in"}
          </p>
          {session?.user?.name && (
            <p className="text-sm text-muted-foreground">{session.user.name}</p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <h2 className="text-lg font-semibold">Admin</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Extension: add approved-user list, invite codes, or role-based
            access here. Use{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ALLOWED_EMAILS</code>{" "}
            in .env to restrict sign-in to specific emails.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
