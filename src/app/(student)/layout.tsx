"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { useEffect } from "react";
import {
  BookOpen,
  ClipboardList,
  StickyNote,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/cases", label: "Cases", icon: ClipboardList },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/reference", label: "Reference", icon: BookOpen },
  { href: "/osce", label: "OSCE", icon: GraduationCap },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, setUser } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur safe-top">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">FCM</span>
            <span className="text-xs text-muted-foreground">
              {user.name}
            </span>
          </div>
          <button
            onClick={() => {
              setUser(null);
              router.push("/");
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur safe-bottom">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", isActive && "text-primary")}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
