import { Header } from "@/components/layout/Header";
import { AnomalieTable } from "@/components/anomalie/AnomalieTable";

export default function AnomaliePage() {
  return (
    <>
      <Header title="Anomalie Presenze" />
      <div className="page-content">
        <AnomalieTable />
      </div>
    </>
  );
}
