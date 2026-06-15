import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { 
  Loader2, LayoutDashboard, FileText, 
  BookOpen, Video, Package, MessageSquare, 
  Users, Settings, LogOut, ShieldAlert,
  Clock, Layers, ChevronRight,
  ArrowLeft, Shield, Menu, X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { auth } from '../../lib/firebase';

export function AdminLayout() {
  const { adminUser, loading, isAuthenticated, isSuperAdmin, isContentAdmin, dbError } = useAdminAuth();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#1D9E75]" size={48} />
          <p className="text-gray-500 font-medium">Authenticating Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (adminUser && !adminUser.isActive) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Suspended</h1>
          <p className="text-gray-500 mb-8">
            Your admin access has been suspended. Contact the Super Admin for more information.
          </p>
          <Button onClick={() => auth.signOut()} className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 font-bold">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const roleBadges = {
    super_admin: <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">⭐ Super Admin</span>,
    content_admin: <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">Content Admin</span>,
    readonly_admin: <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">Read Only</span>
  };

  const navGroups = [
    {
      label: "Overview",
      items: [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Audit Log', path: '/admin/audit', icon: Clock },
      ]
    },
    ...(isContentAdmin ? [{
      label: "Content",
      items: [
        { name: 'Content Hub', path: '/admin/content', icon: Layers },
        { name: 'Past Papers', path: '/admin/papers', icon: FileText },
        { name: 'Resources', path: '/admin/resources', icon: BookOpen },
        { name: 'Video Lessons', path: '/admin/videos', icon: Video },
        { name: 'Study Packs', path: '/admin/study-packs', icon: Package },
      ]
    }] : []),
    ...(isContentAdmin ? [{
      label: "Community",
      items: [
        { name: 'Discussions', path: '/admin/discussions', icon: MessageSquare },
      ]
    }] : []),
    ...(isSuperAdmin ? [{
      label: "People",
      items: [
        { name: 'Users', path: '/admin/users', icon: Users },
        { name: 'Admin Management', path: '/admin/manage', icon: Shield },
      ]
    }] : []),
    ...(isSuperAdmin ? [{
      label: "Settings",
      items: [
        { name: 'Platform Settings', path: '/admin/settings', icon: Settings },
      ]
    }] : [])
  ];

  const currentPageTitle = [...navGroups.flatMap(g => g.items)].find(item => item.path === location.pathname)?.name || 'Admin Panel';

  return (
    <div className="min-h-screen bg-black flex transition-all">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-[#0A0A0A] border-r border-gray-800 flex flex-col fixed inset-y-0 z-[70] transition-transform duration-300 transform lg:relative lg:translate-x-0 w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1D9E75] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#1D9E75]/20">
                <span className="font-bold">G</span>
              </div>
              <span className="font-bold text-white text-sm">GMA Admin</span>
            </Link>
            <button className="lg:hidden text-gray-500 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="mb-8 p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-white truncate">{adminUser?.displayName}</span>
              {adminUser?.role && roleBadges[adminUser.role]}
            </div>
          </div>

          <nav className="space-y-6 overflow-y-auto max-h-[calc(100vh-300px)] pr-2 custom-scrollbar">
            {navGroups.map((group) => (
              <div key={group.label}>
                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-4 mb-2">{group.label}</h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all group relative",
                        location.pathname === item.path 
                          ? "bg-[#1D9E75]/10 text-[#1D9E75] border-l-2 border-[#1D9E75]" 
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      )}
                    >
                      <item.icon size={18} className={cn(
                        "transition-colors",
                        location.pathname === item.path ? "text-[#1D9E75]" : "text-gray-600 group-hover:text-gray-400"
                      )} />
                      {item.name}
                      {location.pathname === item.path && (
                        <ChevronRight size={14} className="ml-auto opacity-50" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-gray-800 space-y-2">
          <Link to="/" className="flex items-center gap-3 p-2 text-gray-500 hover:text-white text-xs transition-all">
            <ArrowLeft size={14} /> Back to GMA
          </Link>
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all text-xs font-medium"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full min-h-screen bg-[#050505] overflow-x-hidden">
        {dbError && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 lg:px-8 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert size={16} className="text-amber-500 shrink-0" />
              <p className="text-[10px] sm:text-[11px] text-amber-500 font-medium leading-tight">
                <span className="font-bold uppercase mr-2">Config Alert:</span> 
                Check Firestore database ID configuration.
              </p>
            </div>
          </div>
        )}
        <header className="h-16 lg:h-14 bg-[#111111] border-b border-gray-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="text-white font-bold text-sm truncate max-w-[150px] sm:max-w-none">
              {currentPageTitle}
            </h2>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex text-[10px] font-mono text-gray-500 uppercase tracking-wider items-center gap-2">
              <Clock size={12} className="text-[#1D9E75]" />
              {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </div>
            
            <div className="flex items-center gap-3 sm:pl-6 sm:border-l border-gray-800">
              <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 overflow-hidden shrink-0">
                {adminUser?.displayName?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
