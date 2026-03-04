import { NavLink, Outlet } from "react-router-dom"
import { navigationItems } from "@/lib/app-routes"
import { ConnectionBar } from "@/components/ConnectionBar"

function navClassName(isActive: boolean): string {
  return [
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
  ].join(" ")
}

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {navigationItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => navClassName(isActive)}>
                {item.label}
              </NavLink>
            ))}
          </div>
          <ConnectionBar />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
