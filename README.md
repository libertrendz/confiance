# CONFIANCE — Ponto + Orçamentos (Supabase + Next.js + shadcn/ui)

Objetivo: app web/PWA em free tier (EU) com dois módulos: **Ponto** e **Orçamentos**.

## Stack
- **DB/Auth/Storage:** Supabase (EU, free tier)
- **Frontend:** Next.js + React + Tailwind + React Query + (depois) shadcn/ui
- **Deploy:** Vercel (free)
- **Export:** CSV friendly + Print-to-PDF
- **Fotos:** bucket privado `pontos-fotos` (câmera em entrada/saída)
- **Geo:** Geolocation API (lat/lon/accuracy)

---

## 0) Clonar e instalar
```bash
pnpm i
# ou
npm i
```

> Pré-requisitos: Node 18+, conta Supabase, conta Vercel.

---

## 1) Supabase (EU)
1. Crie um projeto Supabase (região **EU**).  
2. No **SQL Editor**, cole e execute o conteúdo de `migrations/000_init_confiance.sql`.  
3. Ainda no SQL Editor, crie o **bucket** privado `pontos-fotos` em Storage:
   - Vá em **Storage → Create new bucket** → `pontos-fotos` → **Private**.  
4. Execute `migrations/010_storage_policies.sql` para as policies do bucket.
5. Crie uma **empresa** e seu **profile** de admin:
   ```sql
   insert into public.empresas (nome) values ('Empresa Demo') returning id;
   -- copie o id retornado para <EMPRESA_ID>

   -- Depois de fazer login pelo menos uma vez (Magic Link) o seu usuário estará em auth.users
   -- Substitua o email abaixo:
   insert into public.profiles (user_id, empresa_id, papel, nome)
   select u.id, '<EMPRESA_ID>'::uuid, 'admin'::papel_enum, 'Admin'
   from auth.users u
   where u.email = 'SEU_EMAIL@EXEMPLO.COM'
   on conflict (user_id) do update set empresa_id=excluded.empresa_id, papel=excluded.papel;
   ```

---

## 2) Variáveis de ambiente
Copie `.env.local.example` para `.env.local` e preencha:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 3) shadcn/ui (opcional no primeiro run)
Este scaffold usa **Tailwind** puro nas páginas iniciais para rodar logo.
Quando quiser, adicione shadcn/ui:
```bash
# Inicializar shadcn
pnpm dlx shadcn-ui@latest init
# Componentes básicos
pnpm dlx shadcn-ui@latest add button input form card table dialog dropdown-menu toast
```
Depois ajuste importações conforme necessário em `components/ui/...`.

---

## 4) Rodar local
```bash
pnpm dev
# ou
npm run dev
```
Aceda: http://localhost:3000

---

## 5) Deploy na Vercel
1. No painel, **Add New Project** → importe o repositório.
2. **Env Vars**: cole todas as do `.env.local`.  
3. **Build Command**: `pnpm build` (ou `npm run build`).  
4. **Output**: `.next`.  
5. **Deploy**.

---

## 6) Fluxo do Módulo Ponto
- `/ponto` captura geo e, em entrada/saída, exige foto.
- Em offline, guarda no localStorage e botão **Sincronizar** tenta enviar.
- Admins gerem `/adm/pendencias` (aprovar/rejeitar/ajustar com observação).

## 7) Fluxo do Módulo Orçamentos
- `/adm/orcamentos` lista; `orcamento_criar` gera número `YYYY-####` único.
- Totais via `orcamento_recalcular` no SQL.
- Exportações: CSV e Print stylesheet.

---

## 8) Scripts
```bash
pnpm lint
pnpm build
```

## 9) Free tier friendly
- RPCs recebem `empresa_id` explicitamente.
- Policies RLS por `empresa_id` e papéis (`admin`, `gestor`, `externo`).
- Bucket privado com prefixo `empresa_id/funcionario_id/...`.
