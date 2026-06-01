<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Política de commits (Nexa)

Este projeto usa commits organizados por feature. Para evitar acúmulo de mudanças sem versionar:

**Sempre fazer commit ao final de uma unidade lógica de trabalho** — após terminar uma feature completa (ex: "CRUD de clientes"), uma correção de bug crítico, ou uma sessão substancial de mudanças. Isso vale para você (agente) e o usuário.

Padrão de commit:
```
<tipo>: <descrição curta no imperativo>

- Bullet point 1
- Bullet point 2

Co-Authored-By: <modelo> <noreply@anthropic.com>
```

Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`.

Após commit, **fazer push imediatamente** (`git push`). O remote é `origin/main` no GitHub.

**Não commitar:**
- `.env.local` (já gitignored)
- `.agents/`, `skills-lock.json`, `.claude/` (configs locais)
- Migrations não aplicadas no Supabase ainda — comitar é OK (são fonte de verdade), só não esquecer de aplicar manualmente.

**Atalho:** `npm run save` gera um commit `wip:` com timestamp + push automático. Útil pra salvar progresso intermediário entre features.
