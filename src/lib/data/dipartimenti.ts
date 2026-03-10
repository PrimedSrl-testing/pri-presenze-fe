import type { DeptManagersMap } from "@/types";

export const DIPARTIMENTI: string[] = [
  "ACQUISTI",
  "AMMINISTRAZIONE",
  "ANTE",
  "AUTISTI",
  "AVVOLGENTI",
  "BANCO ACCETTAZIONE",
  "COMMERCIALE ITALIA",
  "DIREZIONE",
  "DIVA/SWITCH",
  "EDP",
  "IMBALLI",
  "LOGISTICA",
  "MAGAZZINO",
  "PLISSETTATE",
  "R&S",
  "RIPARAZIONI AVVOLGENTI",
  "RIPARAZIONI DIVA",
  "MARKETING",
];

export const DEPT_MANAGERS_DEFAULT: DeptManagersMap = {
  "COMMERCIALE ITALIA": {
    managers: ["E034", "E072"],
    area_managers: ["E120", "E143"],
    resp_principale: "E034",
    am_risponde_a: ["E120", "E143"],
  },
  "AMMINISTRAZIONE": {
    managers: ["C001"],
    area_managers: [],
    resp_principale: "C001",
    am_risponde_a: [],
  },
  "EDP": {
    managers: ["E010"],
    area_managers: ["E005"],
    resp_principale: "E010",
    am_risponde_a: ["E005"],
  },
  "LOGISTICA": {
    managers: ["E020"],
    area_managers: [],
    resp_principale: "E020",
    am_risponde_a: [],
  },
  "MAGAZZINO": {
    managers: ["E030"],
    area_managers: ["E025"],
    resp_principale: "E030",
    am_risponde_a: ["E025"],
  },
  "DIREZIONE": {
    managers: ["E001"],
    area_managers: [],
    resp_principale: "E001",
    am_risponde_a: [],
  },
};
