import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/lib/settings-context";
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Gamepad2, Calculator, BarChart3, Users } from "lucide-react";
import NotFound from "@/pages/not-found";
import CalculatorPage from "@/pages/calculator";
import ComparisonPage from "@/pages/comparison";
import BulkHiringPage from "@/pages/bulk-hiring";
import SnakePage from "@/pages/snake";

const NAV_ITEMS = [
  { path: "/", label: "Play Snake", icon: Gamepad2 },
  { path: "/calculator", label: "Calculator", icon: Calculator },
  { path: "/comparison", label: "All Positions", icon: BarChart3 },
  { path: "/bulk-hiring", label: "Bulk Hiring", icon: Users },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function DesktopNav() {
  const [location] = useLocation();

  return (
    <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.path;
        return (
          <Link key={item.path} href={item.path}>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 toggle-elevate ${isActive ? "toggle-elevated" : ""}`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Gamepad2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">Snake That Bites</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
              Classic Snake + sarcasm
            </p>
          </div>
        </div>

        <DesktopNav />

        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={SnakePage} />
      <Route path="/calculator" component={CalculatorPage} />
      <Route path="/comparison" component={ComparisonPage} />
      <Route path="/bulk-hiring" component={BulkHiringPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <SettingsProvider>
            <div className="min-h-screen flex flex-col">
              <AppHeader />
              <main className="flex-1">
                <Router />
              </main>
            </div>
            <Toaster />
          </SettingsProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
