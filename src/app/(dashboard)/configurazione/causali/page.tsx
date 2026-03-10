import { Header } from "@/components/layout/Header";
import { CausaliConfig } from "@/components/configurazione/CausaliConfig";

export default function CausaliPage() {
  return (
    <>
      <Header title="Configurazione Causali" />
      <div className="page-content">
        <CausaliConfig />
      </div>
    </>
  );
}
