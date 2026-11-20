#!/usr/bin/env bash
# Public foreground entry. Ownership, preparation and service cleanup have one owner.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$ROOT/tools/env.sh"
set -euo pipefail
exec node "$SCRIPT_DIR/start-channel.mjs" "$@"
