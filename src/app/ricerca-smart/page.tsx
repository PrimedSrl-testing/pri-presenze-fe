import { SmartSearch } from "./SmartSearch";

export default function Page() {
  return (
    <div className="p-6">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold">Ricerca Smart</h1>
        <p className="text-sm text-gray-600">
          Scrivi in linguaggio naturale (es. “piedino regolabile per UNIKVER”) e ti indico codice articolo e giacenze.
        </p>
      </div>
      <SmartSearch />
    </div>
  );
}
