# Deploy automático (GitHub Actions)

Ao dar `git push` na branch `main`, o GitHub conecta no VPS por SSH e atualiza só a Majesté (`/var/www/majeste`). Você não precisa ficar no terminal do servidor.

Workflow: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)

## Secrets (GitHub → Settings → Secrets and variables → Actions)

| Secret | Exemplo / valor |
|--------|------------------|
| `KVM_HOST` | `85.31.60.61` |
| `KVM_USER` | `root` |
| `KVM_SSH_KEY` | Conteúdo **completo** da chave privada (`-----BEGIN … PRIVATE KEY-----` …) |
| `KVM_SSH_PASSPHRASE` | Senha da chave, ou deixe vazio se a chave não tiver |
| `KVM_APP_DIR` | `/var/www/majeste` |
| `REPO_URL` | `https://github.com/amajesteroupas-dev/amajeste.git` (repo privado: URL com token de leitura) |

## Chave SSH no VPS (uma vez)

No seu PC (PowerShell), se ainda não tiver chave de deploy:

```powershell
ssh-keygen -t ed25519 -C "github-actions-majeste" -f "$env:USERPROFILE\.ssh\majeste_deploy" -N '""'
```

1. Copie o conteúdo de `majeste_deploy.pub` e, no VPS, acrescente em `/root/.ssh/authorized_keys`.
2. Copie o conteúdo de `majeste_deploy` (privado) para o secret `KVM_SSH_KEY`.

Teste:

```powershell
ssh -i $env:USERPROFILE\.ssh\majeste_deploy root@85.31.60.61 "echo OK"
```

## Uso no dia a dia

```powershell
git add .
git commit -m "sua mensagem"
git push
```

Acompanhe em: GitHub → aba **Actions**. O build no VPS pode levar alguns minutos; o seu trabalho no PC é só o push.

## Disparo manual

GitHub → Actions → **Deploy Majesté (isolado)** → **Run workflow**.
