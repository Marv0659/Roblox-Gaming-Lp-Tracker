import { signIn } from "@/auth";
import { GoogleSignInForm } from "@/components/google-signin-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const hasGoogle =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="pt-8">
          <h1 className="mb-2 text-center text-xl font-semibold">
            RobloxGamingTracker
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Sign in to view the leaderboard
          </p>
          {hasGoogle ? (
            <GoogleSignInForm />
          ) : (
            <form
              action={async (formData) => {
                "use server";
                await signIn("credentials", {
                  email: formData.get("email") as string,
                  password: formData.get("password") as string,
                  redirectTo: "/dashboard",
                });
              }}
              className="space-y-3"
            >
              <p className="text-center text-xs text-muted-foreground">
                Google not configured. Use any email + password{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">dev</code>.
              </p>
              <Input
                name="email"
                type="email"
                placeholder="Email"
                required
              />
              <Input
                name="password"
                type="password"
                placeholder="Password"
                required
              />
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
