"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function GoogleSignInForm() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken ?? data.token ?? null));
  }, []);

  if (!csrfToken) {
    return (
      <Button className="w-full" disabled>
        Loading…
      </Button>
    );
  }

  return (
    <form method="post" action="/api/auth/signin/google" className="w-full">
      <input type="hidden" name="callbackUrl" value="/dashboard" />
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <Button type="submit" className="w-full">
        Sign in with Google
      </Button>
    </form>
  );
}
