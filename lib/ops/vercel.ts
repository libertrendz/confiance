// lib/ops/vercel.ts

const VERCEL_API = "https://api.vercel.com";

export interface VercelDeploymentInfo {
  id: string;
  url: string;
  state: string;
  createdAt: string;
  error?: string;
}

export async function getLastDeployment(): Promise<VercelDeploymentInfo | null> {
  const token = process.env.OPS_VERCEL_TOKEN;
  const projectId = process.env.OPS_VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    console.warn("[OPS] Vercel envs incompletas — OPS_VERCEL_TOKEN / OPS_VERCEL_PROJECT_ID");
    return null;
  }

  const url = `${VERCEL_API}/v6/deployments?projectId=${encodeURIComponent(
    projectId
  )}&limit=1`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao obter deploys da Vercel: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const deployment = json.deployments?.[0];

  if (!deployment) return null;

  return {
    id: deployment.uid,
    url: `https://${deployment.url}`,
    state: deployment.state,
    createdAt: new Date(deployment.createdAt).toISOString(),
    error: deployment.error?.message ?? undefined,
  };
}
