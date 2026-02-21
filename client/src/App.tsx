import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/lib/settings-context";
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import { TourProvider, useTour } from "@/lib/tour-context";
import { SettingsDialog } from "@/components/settings-dialog";
import { TourOverlay } from "@/components/tour-overlay";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  BarChart3,
  Users,
  Sun,
  Moon,
  PlayCircle,
  Brain,
  Gamepad2,
} from "lucide-react";
import NotFound from "@/pages/not-found";
import CalculatorPage from "@/pages/calculator";
import ComparisonPage from "@/pages/comparison";
import BulkHiringPage from "@/pages/bulk-hiring";
import SnakePage from "@/pages/snake";
import BrainPage from "@/pages/brain";

const NAV_ITEMS = [
  { path: "/", label: "Brain 2.0", icon: Brain },
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

function TourButton() {
  const { startTour } = useTour();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={startTour}
      className="gap-1.5 text-xs"
      data-testid="button-start-tour"
    >
      <PlayCircle className="h-3.5 w-3.5" />
      Tour
    </Button>
  );
}

function DesktopNav() {
  const [location] = useLocation();

  return (
    <nav className="hidden md:flex items-center gap-0.5" data-testid="nav-desktop" data-tour-id="tour-nav">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.path;
        return (
          <Link key={item.path} href={item.path}>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 toggle-elevate ${isActive ? "toggle-elevated" : ""}`}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
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

function MobileNav() {
  const [location, setLocation] = useLocation();
  const currentItem = NAV_ITEMS.find((item) => item.path === location) || NAV_ITEMS[0];

  return (
    <div className="md:hidden" data-testid="nav-mobile" data-tour-id="tour-nav">
      <Select value={location} onValueChange={(value) => setLocation(value)}>
        <SelectTrigger className="w-[180px]" data-testid="select-mobile-nav">
          <div className="flex items-center gap-2">
            <currentItem.icon className="h-4 w-4" />
            <SelectValue>{currentItem.label}</SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {NAV_ITEMS.map((item) => (
            <SelectItem key={item.path} value={item.path}>
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">Brain 2.0</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
              Telegram Thoughts Console
            </p>
          </div>
        </div>

        <DesktopNav />
        <MobileNav />

        <div className="flex items-center gap-1">
          <TourButton />
          <ThemeToggle />
          <SettingsDialog />
        </div>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={BrainPage} />
      <Route path="/snake" component={SnakePage} />
      <Route path="/calculator" component={CalculatorPage} />
      <Route path="/comparison" component={ComparisonPage} />
      <Route path="/bulk-hiring" component={BulkHiringPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [, setLocation] = useLocation();

  return (
    <TourProvider onNavigate={setLocation}>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1">
          <Router />
        </main>
        <footer className="border-t py-4 text-center text-xs text-muted-foreground/60 font-medium space-y-1">
          <p>Brain 2.0 | Telegram Thought Capture Console</p>
          <p>
            Made by{" "}
            <a
              href="https://www.linkedin.com/in/ameyaagrawal"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover-elevate"
              data-testid="link-linkedin"
            >
              Ameya Agrawal
            </a>
            {" | "}
            <a
              href="https://ameya.page"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover-elevate"
              data-testid="link-website"
            >
              Ameya.page
            </a>
          </p>
        </footer>
      </div>
      <Toaster />
      <TourOverlay />
    </TourProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AppContent />
          </SettingsProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
