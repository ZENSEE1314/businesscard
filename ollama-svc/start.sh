#!/bin/sh
# Serve in the background, wait until ready, pull the model once (persists on
# the volume), then hand the foreground back to the server.
ollama serve &
SERVE_PID=$!

for i in $(seq 1 90); do
  if ollama list >/dev/null 2>&1; then break; fi
  sleep 1
done

MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"
if ! ollama list 2>/dev/null | grep -q "$MODEL"; then
  echo "Pulling model $MODEL ..."
  ollama pull "$MODEL" || echo "Model pull failed; will retry on demand."
fi

wait "$SERVE_PID"
