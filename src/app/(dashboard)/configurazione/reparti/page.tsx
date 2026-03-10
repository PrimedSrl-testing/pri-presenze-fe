import { Header } from "@/components/layout/Header";
import { RepartiConfig } from "@/components/configurazione/RepartiConfig";

export default function RepartiPage() {
  return (
    <>
      <Header title="Configurazione Reparti & Manager" />
      <div className="page-content">
        <RepartiConfig />
      </div>
    </>
  );
}
