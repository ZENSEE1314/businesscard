# Ollama with the model baked into the boot sequence so it is present on the
# mounted volume (/root/.ollama) for the app to use over private networking.
FROM ollama/ollama:latest
ENV OLLAMA_HOST=0.0.0.0:11434
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh
ENTRYPOINT []
CMD ["/usr/local/bin/start.sh"]
