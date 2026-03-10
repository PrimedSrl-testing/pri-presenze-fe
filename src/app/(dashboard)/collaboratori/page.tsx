import { Header } from "@/components/layout/Header";
import { CollaboratoriTable } from "@/components/collaboratori/CollaboratoriTable";

export default function CollaboratoriPage() {
  return (
    <>
      <Header title="Collaboratori" />
      <div className="page-content">
        <CollaboratoriTable />
      </div>
    </>
  );
}
