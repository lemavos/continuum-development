import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { searchApi } from "@/lib/api";
import {
  LayoutDashboard,
  StickyNote,
  Network,
  Search,
  LogOut,
  User,
  HardDrive,
  CreditCard,
  Menu,
  X,
  Loader2,
  GitGraph,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/notes", icon: StickyNote, label: "Notas" },
  { to: "/entities", icon: Network, label: "Entidades" },
  { to: "/graph", icon: GitGraph, label: "Grafo" },
  { to: "/vault", icon: HardDrive, label: "Vault" },
  { to: "/subscription", icon: CreditCard, label: "Assinatura" },
];

interface SearchResult {
  id: string;
  type: "NOTE" | "ENTITY";
  title: string;
  snippet?: string;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await searchApi.search(q);
      setSearchResults(data.slice(0, 8));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchFocused(false);
    if (result.type === "NOTE") navigate(`/notes/${result.id}`);
    else navigate(`/entities/${result.id}`);
    setSidebarOpen(false);
  };

  const sidebar = (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-sidebar-foreground">Continuum</h2>
        <button
          className="lg:hidden p-1 rounded hover:bg-sidebar-accent"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5 text-sidebar-foreground" />
        </button>
      </div>

      <div className="p-3 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="pl-9 h-8 text-sm bg-sidebar-accent border-0"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />
          )}
        </div>
        {searchFocused && searchResults.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {searchResults.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onMouseDown={() => handleResultClick(r)}
                className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2"
              >
                {r.type === "NOTE" ? (
                  <StickyNote className="w-3.5 h-3.5 text-info shrink-0" />
                ) : (
                  <Network className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{r.title}</p>
                  {r.snippet && (
                    <p className="text-xs text-muted-foreground truncate">{r.snippet}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              location.pathname === item.to
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground">
          <User className="w-4 h-4" />
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium">{user?.username}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.plan || "FREE"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-sm"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-60 border-r border-border bg-sidebar flex-col">
        {sidebar}
      </aside>

      {/* Sidebar - mobile */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-border flex flex-col z-50 transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto lg:pl-0 pl-0">
        <div className="lg:hidden h-14" /> {/* spacer for mobile hamburger */}
        {children}
      </main>
    </div>
  );
}
