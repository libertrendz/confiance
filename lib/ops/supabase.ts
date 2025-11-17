// lib/ops/supabase.ts

export interface ColumnSchemaResumo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface TableSchemaResumo {
  table_name: string;
  columns: ColumnSchemaResumo[];
}

export interface SchemaResumo {
  tables: TableSchemaResumo[];
}

export async function getSchemaResumo(): Promise<SchemaResumo> {
  const url = process.env.OPS_SUPABASE_URL;
  const serviceRole = process.env.OPS_SUPABASE_SERVICE_ROLE;
  const schema = process.env.OPS_SUPABASE_DB_SCHEMA ?? "public";

  if (!url || !serviceRole) {
    console.warn(
      "[OPS] Supabase envs incompletas — OPS_SUPABASE_URL / OPS_SUPABASE_SERVICE_ROLE"
    );
    return { tables: [] };
  }

  const rpcUrl = `${url}/rest/v1/rpc/ops_schema_resumo`;

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_schema: schema }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Erro ao chamar ops_schema_resumo: ${res.status} ${text}`
    );
  }

  const data = (await res.json()) as TableSchemaResumo[] | null;

  return {
    tables: data ?? [],
  };
}
