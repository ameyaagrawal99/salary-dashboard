import { lazy, Suspense } from "react";
import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/lib/settings-context";
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Gamepad2, Calculator, BarChart3, Users, GraduationCap, FileText } from "lucide-react";

const NotFound = lazy(() => import("@/pages/not-found"));
const AdmissionsDashboardPage = lazy(() => import("@/pages/admissions-dashboard"));
const CalculatorPage = lazy(() => import("@/pages/calculator"));
const ComparisonPage = lazy(() => import("@/pages/comparison"));
const BulkHiringPage = lazy(() => import("@/pages/bulk-hiring"));
const SnakePage = lazy(() => import("@/pages/snake"));
const GoogleFormsStudioPage = lazy(() => import("@/pages/google-forms-studio"));

const NAV_ITEMS = [
  { path: "/", label: "Admissions", icon: GraduationCap },
  { path: "/forms-studio", label: "Forms Studio", icon: FileText },
  { path: "/snake", label: "Play Snake", icon: Gamepad2 },
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
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">Analytics Workbench</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
              Admissions and planning intelligence
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
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          Loading workspace...
        </div>
      }
    >
      <Switch>
        <Route path="/" component={AdmissionsDashboardPage} />
        <Route path="/forms-studio" component={GoogleFormsStudioPage} />
        <Route path="/snake" component={SnakePage} />
        <Route path="/calculator" component={CalculatorPage} />
        <Route path="/comparison" component={ComparisonPage} />
        <Route path="/bulk-hiring" component={BulkHiringPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppShell() {
  const [location] = useLocation();
  const showWorkbenchHeader = location !== "/";

  return (
    <div className="min-h-screen flex flex-col">
      {showWorkbenchHeader ? <AppHeader /> : null}
      <main className="flex-1">
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AppShell />
            <Toaster />
          </SettingsProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
