import { Header } from "@/components/layout/Header";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="page-content">
        <ManagerDashboard />
      </div>
    </>
  );
}
