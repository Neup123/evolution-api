# Credential and log safety

Evolution API 4.1.1 sanitizes every value passed through the application logger. It replaces API keys, authorization headers, passwords, secrets, access/refresh tokens, archive keys, JWT keys, and master keys with `[REDACTED]`. JSON serialized inside a request-body string is parsed and sanitized too. Error objects are reduced to their name, safe message, error code, and HTTP status; Axios request configuration and request bodies are not logged.

This matters for the n8n chatbot integration because its trusted request payload includes the instance token so the workflow can call Evolution back. If n8n is unreachable, older releases logged the complete Axios error and could therefore print that payload. Version 4.1.1 keeps only non-secret failure metadata.

`AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=false` is the secure default in `.env.example`. Enable it only when a trusted consumer explicitly requires instance keys in fetch-instance or event payloads. The logger still redacts such keys, but reducing distribution is stronger than relying on redaction.

Redaction affects new log entries only. It does not rewrite Docker, file, or external log history. If a credential was present in logs produced by an older version, rotate that credential and update its authorized consumers.

Archive administration has an additional `x-archive-key`. The manager keeps it only in page memory, and the server logger redacts it. Keep `ARCHIVE_MASTER_KEY` and `ARCHIVE_API_KEY` in the deployment secret store rather than Compose source control.
