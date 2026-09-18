# Ops, support et conformité — checklist production

## 1. Monitoring et alertes
- Mettre en place un monitor externe pour la disponibilité du frontend, backend et base de données.
- Surveiller les endpoints critiques : login, register, modules, ventes, caisse et audits.
- Alertes sur : 5xx, latence élevée, dégradation DB, pannes de login, hausse des 401/429.
- Garder des métriques par organisation et par action critique.

## 2. Logs et support
- Centraliser les logs backend dans un outil de visualisation (ELK, Datadog, Grafana Loki, etc.).
- Conserver les logs d’authentification et de changements de modules pendant une période définie.
- Documenter les procédures de support : reset mot de passe, désactivation de compte, réactivation d’organisation, rollback d’une migration.
- Avoir un canal de support et un niveau de priorité pour les incidents de sécurité.

## 3. Sauvegardes et restauration
- Configurer des backups automatiques de PostgreSQL sur Neon ou sur un service de sauvegarde externe.
- Tester la restauration au moins une fois par trimestre.
- Vérifier les restaurations sur un environnement de test avant validation.
- Définir la stratégie de conservation et la politique de rétention.

## 4. Sécurité et conformité
- Verrouiller les accès de production via gestion centralisée des secrets.
- Définir une politique de rotation des tokens et des clés.
- Faire un audit des dépendances Python et frontend régulièrement.
- Documenter la politique de données et les droits d’accès par rôle.
- Prévoir la procédure de suppression de données pour les organisations supprimées.

## 5. Plan de reprise / incident
- Définir un plan de réponse aux incidents de sécurité.
- Préparer le runbook pour : base cassée, token invalide, accès cross-tenant, module désactivé, erreur de migration.
- Conserver les procédures de rollback et les commandes de récupération.
- Définir le propriétaire de sécurité et le point de contact support.

## 6. Système de gouvernance
- Définir les rôles : admin, seller, support, auditor.
- Conserver l’historique des changements critiques dans les logs d’audit.
- Vérifier les permissions de données par organisation à chaque changement de structure.
- Faire des revues périodiques des accès et des permissions.

## 7. Bonnes pratiques à maintenir
- Pas de SQLite en production.
- Toujours sécuriser le secret JWT, le transport HTTPS et l’environnement.
- Avoir un plan de monitoring et d’alerting avant la croissance de l’usage.
- Faire des revues de sécurité au moins mensuellement sur les accès et composants critiques.

## 8. Documents opérationnels associés
- Runbook détaillé : `docs/OPERATIONS_RUNBOOK.md`
- Checklist de déploiement : `docs/DEPLOYMENT_CHECKLIST.md`
- Monitoring de production : `.github/workflows/production-health-check.yml`
- Backup automatique PostgreSQL : `.github/workflows/postgres-backup.yml`
- Alerting et escalade : `docs/PRODUCTION_ALERTING.md`
- Scripts de backup / restore : `scripts/backup_postgres.py`, `scripts/restore_postgres.py`
- Support UI : `web/src/app/settings/support/page.tsx`
