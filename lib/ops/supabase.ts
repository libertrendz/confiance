// lib/ops/supabase.ts

export interface TableSchemaResumo {
  name: string;
  columns: string[];
}

export interface SchemaResumo {
  tables: TableSchemaResumo[];
}

/**
 * Versão inicial: devolve estrutura vazia mas valida que as envs estão configuradas.
 * No futuro podemos trocar por uma chamada SQL dedicada (função RPC no Supabase).
 */
export async function getSchemaResumo(): Promise<SchemaResumo> {
  const url = process.env.OPS_SUPABASE_URL;
  const serviceRole = process.env.OPS_SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRole) {
    console.warn("[OPS] Supabase envs incompletas — OPS_SUPABASE_URL / OPS_SUPABASE_SERVICE_ROLE");
    return { tables: [] };
  }

  // Aqui poderíamos chamar uma função RPC específica para schema,
  // mas para não quebrar nada vamos apenas devolver vazio por enquanto.
  return { tables: [] };
}
