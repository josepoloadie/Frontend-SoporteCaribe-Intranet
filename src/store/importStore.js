import { create } from 'zustand'

export const useImportStore = create((set) => ({
  progreso: null,
  seleccionPendiente: null,
  setProgreso: (fn) => set(s => ({ progreso: typeof fn === 'function' ? fn(s.progreso) : fn })),
  setSeleccionPendiente: (val) => set({ seleccionPendiente: val }),
  limpiar: () => set({ progreso: null, seleccionPendiente: null }),
}))