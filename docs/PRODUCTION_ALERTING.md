# Production alerting and incident escalation

## Alerting sources
- Frontend monitoring: uptime checks against the Vercel app URL
- Backend monitoring: checks against `/health` and key transactional endpoints
- Database monitoring: CPU, active connections, replication lag, storage pressure
- Security monitoring: rate-limit spikes, repeated login failures, authorization errors

## Critical alerts
- 5xx responses on `/health`, `/api/v1/auth/login`, `/api/v1/cash/*`, and `/api/v1/sales/*`
- database status not `ok`
- repeated 401/403 spikes on privileged routes
- `429` on login attempts
- module toggles or admin access events outside expected maintenance windows

## Escalation policy
1. Notify the on-call owner and support lead immediately.
2. Check backend health, database connectivity, and last audit events.
3. If cross-tenant access is suspected, suspend the user and isolate the org.
4. If DB is unhealthy, restore from last known valid backup in staging before production reactivation.
5. Document the incident, the fixes applied, and the postmortem in the support channel.

## Recommended tooling
- Uptime: UptimeRobot / Better Stack / StatusCake
- Logs: Datadog / Grafana Loki / ELK
- Errors: Sentry
- Database monitoring: Neon/managed Postgres metrics or external DB observability
- Alert delivery: Slack or Discord webhooks configured through GitHub Actions secrets

## Monitoring secrets to configure
- `FRONTEND_URL`
- `BACKEND_URL`
- `SLACK_WEBHOOK_URL` (optional)
- `DISCORD_WEBHOOK_URL` (optional)
- `DATABASE_URL` for backup automation

## Minimum daily checks
- confirm `/health` is green
- confirm login flow still succeeds for a test user
- confirm module toggling still works for an admin account
- confirm recent audit entries are visible in support and security logs
