import { Sidebar } from "@/components/layout/Sidebar";
import { ToastContainer } from "@/components/ui/Toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bgs)" }}>
      <Sidebar />
      <main className="main">
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}
