#!/bin/sh
# Pull the model in the background once the server accepts connections, then run
# the server in the foreground so the container is healthy immediately (the
# model download must not block/again fail the Railway deploy).
(
  for i in $(seq 1 120); do
    if ollama list >/dev/null 2>&1; then break; fi
    sleep 1
  done
  MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"
  if ! ollama list 2>/dev/null | grep -q "$MODEL"; then
    echo "Pulling model $MODEL ..."
    ollama pull "$MODEL" && echo "Model $MODEL ready." || echo "Model pull failed; will retry on next boot."
  fi
) &

exec ollama serve
