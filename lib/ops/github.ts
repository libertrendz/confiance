// lib/ops/github.ts
import { Octokit } from "octokit";

const token = process.env.OPS_GITHUB_TOKEN;

if (!token) {
  console.warn(
    "[OPS] OPS_GITHUB_TOKEN não definido — funções de GitHub Ops vão falhar."
  );
}

const octokit = token ? new Octokit({ auth: token }) : null;

export async function getRepoFile(params: {
  owner?: string;
  repo?: string;
  path: string;
  ref?: string;
}) {
  if (!octokit) {
    throw new Error("Octokit não configurado (falta OPS_GITHUB_TOKEN).");
  }

  const owner = params.owner ?? "libertrendz";
  const repo = params.repo ?? "confiance";
  const ref = params.ref ?? "main";

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
