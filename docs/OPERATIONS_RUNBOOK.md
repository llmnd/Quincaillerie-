# Runbook d’exploitation et support

## 1. Gouvernance et responsabilités
- Propriétaire produit : direction de l’ERP / gestionnaire d’application.
- Propriétaire support : personne ou équipe dédiée à la réponse aux incidents.
- Point de contact sécurité : responsable accès, mot de passe, droits et revue des modules.
- Rôles support standard : admin, seller, support, auditor.

## 2. Définition des niveaux d’incident
- Niveau 1 : indisponibilité majeure ou blocage de transaction critique.
- Niveau 2 : dégradation fonctionnelle sur une zone métier importante.
- Niveau 3 : anomalie mineure ou demande de support documentaire.

## 3. Monitoring de production
- Vérifier au moins toutes les 15 minutes la disponibilité du frontend et du backend via le workflow GitHub Actions.
- Surveiller les endpoints suivants : login, register, modules, ventes, caisse, audit.
- Alertes recommandées :
  - 5xx sur le backend
  - hausse des 401/403 autorisée uniquement sur les comptes concernés
  - augmentation du taux de 429 sur le login
  - dégradation de la base de données ou charge CPU anormale
- Surveiller aussi : temps de réponse, erreurs d’authentification, changements de modules, ouverture/fermeture de caisse.

## 4. Procédure de support — incidents courants

### A. Utilisateur bloqué / token invalide
1. Vérifier si le token est expiré ou si l’utilisateur a été désactivé.
2. Contrôler le statut organisationnel et les modules autorisés.
3. Demander une reconnexion ou un reset de session.
4. Vérifier les traces d’audit et l’historique de login.
5. Si le problème est massif, valider le niveau de rate limiting et la date de rotation des secrets.

### B. Accès cross-tenant ou accès non autorisé
1. Vérifier la requête sur l’endpoint concerné.
2. Vérifier le `organization_id` côté backend et l’utilisateur connecté.
3. Rechercher une entrée d’audit sur l’action.
4. Bloquer immédiatement l’utilisateur concerné si nécessaire.
5. Corriger la route ou le contrôle de dépendance et relancer le test de sécurité correspondant.

### C. Module désactivé ou page inaccessible
1. Vérifier l’état du module dans la table d’organisation et la configuration de l’org.
2. Vérifier que l’utilisateur a bien le bon rôle actif pour cette organisation.
3. Recharger l’application et valider la route `/settings/modules`.
4. Si un package de module a été désactivé par erreur, réactiver puis confirmer la redirection.

### D. Dégradation de la base de données
1. Vérifier `/health` et le statut de la base.
2. Vérifier les logs de migration et d’application.
3. Vérifier si la base est PostgreSQL en production ; ne pas autoriser le mode SQLite en prod.
4. Si la base est dégradée, basculer vers le mode lecture seule si disponible, puis faire remonter l’incident.

## 5. Sauvegardes et restauration

### Sauvegardes
- Les bases PostgreSQL doivent être sauvegardées automatiquement avec une fenêtre de rétention définie.
- Stocker les sauvegardes dans un service externe de stockage ou de base de données vérifié.
- Vérifier au moins une fois par trimestre qu’une sauvegarde est réellement lisible.

### Scripts de sauvegarde et restauration fournis
- Sauvegarde : `python scripts/backup_postgres.py`
- Restauration : `BACKUP_FILE=./backups/erp_backup_YYYYMMDD_HHMMSSZ.sql DATABASE_URL=postgresql://... python scripts/restore_postgres.py`
- Backup automatique : workflow GitHub Actions `.github/workflows/postgres-backup.yml` exécuté chaque jour à 02:00 UTC et manuellement via `workflow_dispatch`
- Monitoring externe : workflow GitHub Actions `.github/workflows/production-monitoring.yml` exécuté toutes les 10 minutes et envoyant des alertes Slack/Discord si le service est dégradé

### Secrets requis pour le backup automatique
- `DATABASE_URL`
- `AWS_S3_BUCKET` (optionnel, pour synchroniser vers S3)
- `AWS_ACCESS_KEY_ID` (optionnel)
- `AWS_SECRET_ACCESS_KEY` (optionnel)
- `AWS_REGION` (optionnel, défaut `eu-west-3`)

### Procédure de restauration
1. Identifier la restauration cible : environnement non productif en priorité.
2. Récupérer la dernière sauvegarde valide.
3. Restaurer la base dans un environnement de test ou de staging.
4. Vérifier : schémas, données, contraintes, identifiants, modules et droits d’accès.
5. Exécuter un test fonctionnel minimal sur les flux critiques : login, ventes, caisse, modules et audit.
6. Aucun changement de production ne doit être validé sans validation de la restauration.

## 6. Politique de données et conformité
- Définir une politique claire de rétention pour les logs, les factures, les audits et les données métier.
- Prévoir la suppression de données lors d’une fermeture de structure ou d’un départ client.
- Conserver les changements critiques dans les journaux d’audit et documenter les accès.
- Revoir les permissions et les droits au moins mensuellement.

## 7. Rollback et reprise après incident
- En cas de migration cassée : utiliser le script de rollback documenté et restaurer la base à partir d’une sauvegarde valide.
- En cas d’erreur de code : replier rapidement vers la dernière version stable et vérifier la santé du service.
- En cas de fuite de données ou d’anomalie de sécurité : couper immédiatement les accès concernés et documenter l’événement.

## 8. Checklist avant mise en production
- Vérification du health endpoint
- Vérification du niveau d’accès par organisation
- Vérification des rôles et permissions
- Vérification des modules activés par organisation
- Vérification de l’audit sur actions sensibles
- Vérification des secrets et TLS
- Vérification du niveau de surveillance des dépendances externes

## 9. Checklist de fin de semaine / fin de mois
- Vérifier les logs d’authentification et d’audit
- Vérifier les modules actifs et les éventuelles réactivations
- Vérifier l’état général de la caisse et des ventes
- Vérifier la disponibilité de la base de données
- Vérifier les sauvegardes et la restauration de test

## 10. Fichiers utiles
- `/backend/app/main.py` : endpoint `/health` et configuration de l’application.
- `/backend/app/api/deps.py` : dépendances de sécurité et validation d’accès.
- `/backend/app/core/modules.py` : activation des modules par organisation.
- `/backend/app/core/audit.py` : journaux d’audit.
- `/web/src/app/settings/support/page.tsx` : page support pour état système et audit.
