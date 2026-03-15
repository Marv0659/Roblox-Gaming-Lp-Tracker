import { redirect } from "next/navigation";

// No login: redirect any /auth/* to dashboard.
export default function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  redirect("/dashboard");
}
