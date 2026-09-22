#!/usr/bin/env bash
# Exige spec irmão para cada .ts alterado em apps/api e cobertura >= 80%.
set -u

cat >/dev/null

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 0

followup() {
  python3 -c 'import json,sys; print(json.dumps({"followup_message": sys.stdin.read()}))' <<<"$1"
  exit 0
}

# O hook do Cursor não carrega o nvm. Sem isso, `npx` não existe no PATH.
export_node_path() {
  if command -v npx >/dev/null 2>&1; then
    return 0
  fi
  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  local candidate=""
  shopt -s nullglob
  local matches=("$nvm_dir"/versions/node/*/bin/npx)
  shopt -u nullglob
  if ((${#matches[@]} > 0)); then
    candidate="$(printf '%s\n' "${matches[@]}" | sort -V | tail -n 1)"
  fi
  if [[ -z "$candidate" || ! -x "$candidate" ]]; then
    followup "Node não está no PATH deste hook. O comando npx não foi encontrado."
  fi
  export PATH="$(dirname "$candidate"):$PATH"
}

mapfile -t changed < <(
  {
    git diff --name-only --diff-filter=ACMR HEAD -- apps/api/src
    git ls-files --others --exclude-standard -- apps/api/src
  } 2>/dev/null | awk 'NF' | sort -u
)

sources=()
for file in "${changed[@]}"; do
  case "$file" in
    *.spec.ts | *.d.ts) continue ;;
    *.ts) sources+=("$file") ;;
  esac
done

if ((${#sources[@]} == 0)); then
  echo '{}'
  exit 0
fi

missing=()
for file in "${sources[@]}"; do
  spec="${file%.ts}.spec.ts"
  if [[ ! -f "$spec" ]]; then
    missing+=("$file")
  fi
done

if ((${#missing[@]} > 0)); then
  followup "$(printf '%s\n' \
    "Cada arquivo TypeScript alterado em apps/api precisa de um spec irmão (foo.ts → foo.spec.ts), com casos de sucesso e falha. Faltam:" \
    "${missing[@]}")"
fi

summary="coverage/apps/api/coverage-summary.json"
stale=0
if [[ ! -f "$summary" ]]; then
  stale=1
else
  for file in "${sources[@]}"; do
    spec="${file%.ts}.spec.ts"
    if [[ "$file" -nt "$summary" || "$spec" -nt "$summary" ]]; then
      stale=1
      break
    fi
  done
fi

if ((stale == 1)); then
  export_node_path
  output="$(npx nx test api --coverage --skip-nx-cache 2>&1)"
  status=$?
  if ((status != 0)); then
    tail_out="$(printf '%s\n' "$output" | tail -n 40)"
    followup "$(printf '%s\n' \
      "A suíte da api falhou ou a cobertura ficou abaixo de 80% em statements, branches, functions e lines. Corrija os testes antes de encerrar." \
      "$tail_out")"
  fi
fi

if [[ ! -f "$summary" ]]; then
  followup "Rode a suíte da api com cobertura e mantenha statements, branches, functions e lines em pelo menos 80%."
fi

below="$(python3 - "$summary" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))["total"]
keys = ("statements", "branches", "functions", "lines")
bad = [f"{key} {data[key]['pct']}%" for key in keys if data[key]["pct"] < 80]
print(", ".join(bad))
PY
)"

if [[ -n "$below" ]]; then
  followup "Cobertura da api abaixo de 80%: ${below}. Amplie os testes unitários dos arquivos alterados."
fi

echo '{}'
exit 0
