import { Header } from "@/components/layout/Header";
import { RichiesteView } from "@/components/richieste/RichiesteView";

export default function RichiestePage() {
  return (
    <>
      <Header title="Richieste Ferie & Permessi" />
      <div className="page-content">
        <RichiesteView />
      </div>
    </>
  );
}
