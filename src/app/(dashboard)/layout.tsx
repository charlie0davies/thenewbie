import BottomNav from "@/components/layout/BottomNav";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Page content */}
      <div className="lg:ml-60">
        {/* On desktop, center & constrain content width */}
        <div className="max-w-2xl mx-auto px-0 lg:px-8 lg:py-6 pb-20 lg:pb-6">
          {children}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
