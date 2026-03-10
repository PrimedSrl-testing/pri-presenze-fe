import { Header } from "@/components/layout/Header";
import { OrganigrammaView } from "@/components/organigramma/OrganigrammaView";

export default function OrganigrammaPage() {
  return (
    <>
      <Header title="Organigramma" />
      <div className="page-content">
        <OrganigrammaView />
      </div>
    </>
  );
}
