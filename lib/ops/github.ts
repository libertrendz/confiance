// lib/ops/github.ts
import { App } from "octokit";

const appId = process.env.OPS_GITHUB_APP_ID;
const privateKey = process.env.OPS_GITHUB_PRIVATE_KEY;
const installationId = process.env.OPS_GITHUB_INSTALLATION_ID;

if (!appId || !privateKey || !installationId) {
  console.warn("[OPS] GitHub envs incompletas — OPS_GITHUB_APP_ID / OPS_GITHUB_INSTALLATION_ID / OPS_GITHUB_PRIVATE_KEY");
}

const app = appId && privateKey
  ? new App({
      appId: Number(appId),
      privateKey,
    })
  : null;

async function getInstallationOctokit() {
  if (!app) {
    throw new Error("GitHub App não configurado (faltam envs OPS_GITHUB_*).");
  }
  const octokit = await app.getInstallationOctokit(
    Number(installationId)
  );
  return octokit;
}

export async function getRepoFile(params: {
  owner?: string;
  repo?: string;
  path: string;
  ref?: string;
}) {
  const owner = params.owner ?? "libertrendz";
  const repo = params.repo ?? "confiance";
  const ref = params.ref ?? "main";

  const octokit = await getInstallationOctokit();

  const res = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path: params.path,
      ref,
    }
  );

  if (!("content" in res.data)) {
    throw new Error("Conteúdo inesperado ao ler arquivo do GitHub.");
  }

  const contentBase64 = (res.data as any).content as string;
  const content = Buffer.from(contentBase64, "base64").toString("utf8");

  return {
    content,
    sha: (res.data as any).sha as string,
  };
}
