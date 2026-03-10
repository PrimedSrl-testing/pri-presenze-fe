import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Collaboratore,
  Causale,
  Anomalia,
  Richiesta,
  DeptManagersMap,
  ToastMessage,
  RuoloUtente,
} from "@/types";
import { DIPENDENTI_DEFAULT } from "@/lib/data/dipendenti";
import { CAUSALI_DEFAULT } from "@/lib/data/causali";
import { DEPT_MANAGERS_DEFAULT } from "@/lib/data/dipartimenti";

// ─── Toast store (non-persistent) ────────────────────────────────────────────

interface ToastStore {
  toasts: ToastMessage[];
  showToast: (message: string, type: ToastMessage["type"]) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, type) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ─── HR Store (persistent) ────────────────────────────────────────────────────

interface HRState {
  collaboratori: Collaboratore[];
  causali: Causale[];
  anomalie: Anomalia[];
  richieste: Richiesta[];
  deptManagers: DeptManagersMap;
  currentUserId: string;
  currentRole: RuoloUtente;

  // Collaboratori
  addCollaboratore: (c: Collaboratore) => void;
  updateCollaboratore: (id: string, updates: Partial<Collaboratore>) => void;
  deleteCollaboratore: (id: string) => void;

  // Causali
  addCausale: (c: Causale) => void;
  updateCausale: (id: string, updates: Partial<Causale>) => void;
  deleteCausale: (id: string) => void;

  // Anomalie
  resolveAnomalia: (id: string, risoluzione: string, resolvedBy: string) => void;

  // Richieste
  addRichiesta: (r: Richiesta) => void;
  approveRichiesta: (id: string, notaMgr: string, approvedBy: string) => void;
  rejectRichiesta: (id: string, notaMgr: string) => void;

  // Dept managers
  setDeptManagers: (map: DeptManagersMap) => void;

  // Current user
  setCurrentUser: (id: string) => void;
  setCurrentRole: (role: RuoloUtente) => void;
}

export const useHRStore = create<HRState>()(
  persist(
    (set) => ({
      collaboratori: DIPENDENTI_DEFAULT,
      causali: CAUSALI_DEFAULT,
      anomalie: generateMockAnomalie(),
      richieste: generateMockRichieste(),
      deptManagers: DEPT_MANAGERS_DEFAULT,
      currentUserId: "1",
      currentRole: "hr" as RuoloUtente,

      addCollaboratore: (c) =>
        set((s) => ({ collaboratori: [...s.collaboratori, c] })),

      updateCollaboratore: (id, updates) =>
        set((s) => ({
          collaboratori: s.collaboratori.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCollaboratore: (id) =>
        set((s) => ({
          collaboratori: s.collaboratori.filter((c) => c.id !== id),
        })),

      addCausale: (c) =>
        set((s) => ({ causali: [...s.causali, c] })),

      updateCausale: (id, updates) =>
        set((s) => ({
          causali: s.causali.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteCausale: (id) =>
        set((s) => ({ causali: s.causali.filter((c) => c.id !== id) })),

      resolveAnomalia: (id, risoluzione, resolvedBy) =>
        set((s) => ({
          anomalie: s.anomalie.map((a) =>
            a.id === id
              ? {
                  ...a,
                  stato: "risolta",
                  risoluzione,
                  resolvedBy,
                  resolvedAt: new Date().toISOString(),
                }
              : a
          ),
        })),

      addRichiesta: (r) =>
        set((s) => ({ richieste: [...s.richieste, r] })),

      approveRichiesta: (id, notaMgr, approvedBy) =>
        set((s) => ({
          richieste: s.richieste.map((r) =>
            r.id === id
              ? {
                  ...r,
                  stato: "approvata",
                  notaMgr,
                  approvedBy,
                  approvedAt: new Date().toISOString(),
                }
              : r
          ),
        })),

      rejectRichiesta: (id, notaMgr) =>
        set((s) => ({
          richieste: s.richieste.map((r) =>
            r.id === id ? { ...r, stato: "rifiutata", notaMgr } : r
          ),
        })),

      setDeptManagers: (map) => set({ deptManagers: map }),

      setCurrentUser: (id) => set({ currentUserId: id }),
      setCurrentRole: (role) => set({ currentRole: role }),
    }),
    {
      name: "primed-hr-store",
      partialize: (s) => ({
        collaboratori: s.collaboratori,
        causali: s.causali,
        anomalie: s.anomalie,
        richieste: s.richieste,
        deptManagers: s.deptManagers,
        currentUserId: s.currentUserId,
        currentRole: s.currentRole,
      }),
    }
  )
);

// ─── Mock data generators ─────────────────────────────────────────────────────

function generateMockAnomalie(): Anomalia[] {
  return [
    {
      id: "an1",
      empId: "3",
      date: "2026-03-03",
      tipo: "timbratura_mancante",
      gravita: "alta",
      stato: "aperta",
      descrizione: "Timbratura di uscita mancante",
    },
    {
      id: "an2",
      empId: "7",
      date: "2026-03-04",
      tipo: "ritardo",
      gravita: "bassa",
      stato: "aperta",
      descrizione: "Ingresso alle 09:45 (ritardo 45 min)",
    },
    {
      id: "an3",
      empId: "7",
      date: "2026-03-05",
      tipo: "assenza_ingiustificata",
      gravita: "alta",
      stato: "aperta",
      descrizione: "Assenza senza giustificativo",
    },
    {
      id: "an4",
      empId: "2",
      date: "2026-03-02",
      tipo: "orario_insufficiente",
      gravita: "media",
      stato: "risolta",
      descrizione: "Solo 5h lavorate su 8 teoriche",
      risoluzione: "Permesso orario inserito",
      resolvedBy: "2",
      resolvedAt: "2026-03-03T10:00:00",
    },
  ];
}

function generateMockRichieste(): Richiesta[] {
  return [
    {
      id: "rq1",
      empId: "3",
      causaleId: "fer",
      dal: "2026-03-20",
      al: "2026-03-27",
      note: "Ferie primaverili programmate",
      stato: "pending",
      createdAt: "2026-03-08T09:00:00",
    },
    {
      id: "rq2",
      empId: "4",
      causaleId: "perm",
      dal: "2026-03-11",
      al: "2026-03-11",
      ore: 4,
      note: "Visita medica pomeriggio",
      stato: "pending",
      createdAt: "2026-03-09T14:00:00",
    },
    {
      id: "rq3",
      empId: "7",
      causaleId: "sw",
      dal: "2026-03-13",
      al: "2026-03-13",
      note: "Smart working giovedì",
      stato: "approvata",
      createdAt: "2026-03-08T08:30:00",
      notaMgr: "Approvato",
      approvedBy: "1",
      approvedAt: "2026-03-08T12:00:00",
    },
  ];
}
