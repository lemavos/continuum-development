import { ReactNode, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
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
  Menu,
  X,
  Loader2,
  GitGraph,
  Settings,
  Clock,
  HelpCircle,
  FolderOpen,
  Activity,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sidebar, SidebarItem, SidebarGroup, MobileSidebar } from "@/components/sidebar";

const primaryItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/notes", icon: StickyNote, label: "Notes" },
  { to: "/entities", icon: Network, label: "Entities" },
  { to: "/tracking", icon: Clock, label: "Tracking" },
];

const activityItems = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/graph", icon: GitGraph, label: "Analytics" },
  { to: "/projects", icon: FolderOpen, label: "Projects" },
];

const footerItems = [
  { to: "/profile", icon: Settings, label: "Settings" },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
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
      setSearchResults(Array.isArray(data) ? data.slice(0, 8) : []);
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

  const handleHelpClick = () => {
    window.open("mailto:support@continuum.app", "_blank", "noopener noreferrer");
  };

  const desktopSidebar = (
    <Sidebar
      expanded={!sidebarCollapsed}
      onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
    >
      <div className="space-y-4 px-2 pb-4">
        <div className="rounded-3xl bg-white/5 p-3 shadow-[0_20px_50px_rgba(255,255,255,0.04)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search... ⌘K"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="pl-10 h-11 rounded-3xl bg-[#11151f]/90 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>
          {searchFocused && searchResults.length > 0 && (
            <div className="mt-3 space-y-1 rounded-3xl border border-white/10 bg-[#0b0f17]/98 p-2 shadow-[0_30px_50px_rgba(0,0,0,0.35)]">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleResultClick(result)}
                  className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left text-sm text-slate-200 hover:bg-white/5"
                >
                  {result.type === "NOTE" ? (
                    <StickyNote className="h-4 w-4 text-sky-300" />
                  ) : (
                    <Network className="h-4 w-4 text-slate-400" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-100">{result.title}</p>
                    {result.snippet && <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">{result.snippet}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {primaryItems.map((item) => (
            <SidebarItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              collapsed={sidebarCollapsed}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        <div className="rounded-3xl bg-white/5 p-3">
          <SidebarGroup
            title="Activity"
            icon={Activity}
            items={activityItems}
            collapsed={sidebarCollapsed}
            activePath={location.pathname}
            onItemClick={() => setSidebarOpen(false)}
          />
        </div>

        <div className="mt-auto space-y-3">
          <div className="rounded-3xl bg-white/5 p-3 text-slate-300">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-white/10 text-white">
                <User className="h-5 w-5" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{user?.username || "Guest"}</p>
                  <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-500">{user?.plan || "FREE"}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            {footerItems.map((item) => (
              <SidebarItem
                key={item.to}
                icon={item.icon}
                label={item.label}
                to={item.to}
                collapsed={sidebarCollapsed}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
            <SidebarItem
              icon={HelpCircle}
              label="Help"
              collapsed={sidebarCollapsed}
              onClick={handleHelpClick}
            />
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200",
                "text-slate-200 hover:text-white hover:bg-white/5",
                sidebarCollapsed && "justify-center",
              )}
            >
              <LogOut className="h-5 w-5 text-slate-300" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </div>
    </Sidebar>
  );

  return (
    <div className="flex min-h-screen bg-[#05060a] text-white">
      <CommandPalette />

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#05060a]/95 backdrop-blur-sm px-4 py-3">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-white/10 text-white shadow-lg transition hover:bg-white/15"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <Sidebar expanded fullWidth mobileMode onToggleCollapse={() => {}}>
          <div className="space-y-4 px-2 pb-4">
            <div className="rounded-3xl bg-white/5 p-3 shadow-[0_20px_50px_rgba(255,255,255,0.04)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search... ⌘K"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className="pl-10 h-11 rounded-3xl bg-[#11151f]/90 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
              {searchFocused && searchResults.length > 0 && (
                <div className="mt-3 space-y-1 rounded-3xl border border-white/10 bg-[#0b0f17]/98 p-2 shadow-[0_30px_50px_rgba(0,0,0,0.35)]">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleResultClick(result)}
                      className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left text-sm text-slate-200 hover:bg-white/5"
                    >
                      {result.type === "NOTE" ? (
                        <StickyNote className="h-4 w-4 text-sky-300" />
                      ) : (
                        <Network className="h-4 w-4 text-slate-400" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-100">{result.title}</p>
                        {result.snippet && <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">{result.snippet}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <nav className="space-y-1">
              {primaryItems.map((item) => (
                <SidebarItem
                  key={item.to}
                  icon={item.icon}
                  label={item.label}
                  to={item.to}
                  collapsed={false}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </nav>

            <div className="rounded-3xl bg-white/5 p-3">
              <SidebarGroup
                title="Activity"
                icon={Activity}
                items={activityItems}
                collapsed={false}
                activePath={location.pathname}
                onItemClick={() => setSidebarOpen(false)}
              />
            </div>

            <div className="mt-auto space-y-3">
              <div className="rounded-3xl bg-white/5 p-3 text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-3xl bg-white/10 text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{user?.username || "Guest"}</p>
                    <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-500">{user?.plan || "FREE"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {footerItems.map((item) => (
                  <SidebarItem
                    key={item.to}
                    icon={item.icon}
                    label={item.label}
                    to={item.to}
                    collapsed={false}
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}
                <SidebarItem icon={HelpCircle} label="Help" collapsed={false} onClick={handleHelpClick} />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-200 transition-all duration-200 hover:text-white hover:bg-white/5"
                >
                  <LogOut className="h-5 w-5 text-slate-300" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </Sidebar>
      </MobileSidebar>

      <aside className="hidden lg:flex shrink-0">
        {desktopSidebar}
      </aside>

      <main className="flex-1 overflow-auto min-w-0 bg-[#05060a]">
        <div className="lg:hidden h-16" />
        {children}
      </main>
    </div>
  );
}
