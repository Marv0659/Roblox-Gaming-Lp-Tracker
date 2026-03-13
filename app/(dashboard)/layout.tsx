import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
