// lib/flags.ts
// Feature flags simples. Exporta tanto o objeto quanto um getter compatível
// com imports existentes no app.

export const FLAGS = {
  demoMode: true,
  showRiskBadge: true,
};

export function getFlags() {
  return FLAGS;
}
