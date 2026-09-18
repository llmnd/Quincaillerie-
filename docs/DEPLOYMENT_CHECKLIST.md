# Production deployment checklist

## 1. Pre-release validation
- Confirm the backend is configured for production mode, with DEBUG disabled.
- Confirm a strong SECRET_KEY is present and is at least 32 characters long.
- Confirm DATABASE_URL points to PostgreSQL, not SQLite.
- Confirm the app is running with HTTPS and valid CORS origin configuration.
- Confirm all critical migrations have been applied successfully.
- Confirm the health endpoint returns the expected status and database status.

## 2. Security validation
- Verify organization isolation is enforced for all protected endpoints.
- Verify module activation is enforced by organization.
- Verify the role check is validated consistently on sensitive routes.
- Verify login rate limiting is enabled and tested.
- Verify audit logs are generated for sensitive actions.
- Verify the admin support page is accessible only to authorized roles.

## 3. Functional smoke tests
- Login with a valid admin account.
- Create or verify an organization and its default module state.
- Open the dashboard and confirm KPI data loads.
- Open a sales flow and confirm sale creation works.
- Open the cash flow and confirm cash operations are tracked.
- Open the farming flow and confirm health and batch metrics load.
- Check support status and audit information from the support page.

## 4. Production configuration checks
- Confirm FRONTEND_URL and BACKEND_URL secrets are set in the deployment environment.
- Confirm the database backup workflow has the required secrets.
- Confirm no dummy password or placeholder values remain in secrets or docs.
- Confirm application logs are enabled and centralized.
- Confirm alert thresholds are configured for login failures, 5xx responses, and DB degradation.

## 5. Post-deploy verification
- Wait 5 to 10 minutes after deployment and verify an uptime check passes.
- Check the backend health endpoint manually.
- Check recent audit logs for a successful login and a module change.
- Verify the app still loads correctly after a browser refresh.
- Verify support and admin pages remain accessible only to the correct roles.

## 6. Rollback conditions
Rollback to the previous stable deployment if any of the following occurs:
- database health is degraded or unavailable
- critical auth flow fails for multiple users
- organization isolation check fails on protected routes
- module or cash workflows fail for admin actions
- support and audit routes stop returning valid data

## 7. Release sign-off
The release can be considered ready only when:
- health checks are green
- DB is healthy and accessible
- login, modules, sales, cash, and farming flows are passing smoke tests
- audit logs are visible
- backup automation is present and scheduled
- support team has the correct incident runbook and escalation contact
