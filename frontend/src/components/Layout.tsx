import type { ElementType } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Activity, ListChecks, Moon, Repeat2, Sun, TrendingUp } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { ConnectionBar } from "@/components/ConnectionBar";
import { appRoutes, navigationItems } from "@/lib/app-routes";

const navIcons: Record<string, ElementType> = {
  [appRoutes.liveStream]: Activity,
  [appRoutes.repeaters]: Repeat2,
  [appRoutes.workoutProtocols]: ListChecks,
  [appRoutes.maxWeight]: TrendingUp,
};

function navClassName(isActive: boolean): string {
  return [
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  ].join(" ");
}

export function Layout() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center gap-6">
            <span className="shrink-0 select-none text-base font-bold tracking-tight">
              <span className="text-primary">Grip</span>Trainer
            </span>

            <nav className="flex flex-1 items-center gap-1">
              {navigationItems.map((item) => {
                const Icon = navIcons[item.to];
                return (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => navClassName(isActive)}>
                    {Icon ? <Icon className="size-3.5" /> : null}
                    <span className="hidden sm:inline">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="shrink-0"
            >
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:block" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>

          <div className="pb-3">
            <ConnectionBar />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 pt-6">
        <Outlet />
      </main>
    </div>
  );
}
