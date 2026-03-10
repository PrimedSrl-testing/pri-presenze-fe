import { Header } from "@/components/layout/Header";
import { TimesheetView } from "@/components/cartellino/TimesheetView";

export default function CartellinoPage() {
  return (
    <>
      <Header title="Cartellino Presenze" />
      <div className="page-content">
        <TimesheetView />
      </div>
    </>
  );
}
