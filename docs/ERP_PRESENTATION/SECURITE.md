# Sécurité et bonnes pratiques de l’ERP

## Objectif

Le but de cette section est de montrer clairement pourquoi la sécurité est un point clé de l’ERP, et quelles pratiques ont été adoptées pour protéger les données et le bon fonctionnement du système.

## 1. L’ERP n’est pas seulement un outil de gestion

Un ERP contient des informations business sensibles :
- clients
- fournisseurs
- comptabilité
- ventes
- cash / caisse
- historique opérationnel
- modules d’organisation

Si ces données ne sont pas correctement protégées, le système perd immédiatement sa valeur.

## 2. Les principes de sécurité appliqués

### Isolation par organisation
Chaque organisation est séparée des autres. Un utilisateur ne doit pas voir ni manipuler les données d’une autre structure sans autorisation explicite.

### Séparation des rôles
Les utilisateurs ne sont pas tous identiques. Un vendeur n’a pas les mêmes droits qu’un administrateur. Les permissions sont filtrées selon le rôle et l’entreprise.

### Contrôle des modules
Les modules ne sont pas visibles ou activés pour tout le monde. L’entreprise décide ce qu’elle active, et le système respecte cela.

### Audits et traçabilité
Les actions sensibles sont enregistrées pour savoir qui a fait quoi, quand et sur quel objet. Cela aide à la sécurité, au support et à la conformité.

### Protection du login
Les répétitions de tentatives de connexion sont limitées pour empêcher les attaques automatisées.

### Santé du système
Le backend expose un état du système, ce qui permet de surveiller la disponibilité et les éventuels problèmes techniques.

### Sauvegarde
Les données peuvent être sauvegardées et restaurées, ce qui est indispensable pour la reprise d’activité.

## 3. Pourquoi ces pratiques sont importantes

Sans ces garde-fous :
- un utilisateur peut accéder aux données d’une autre entreprise
- un module peut être utilisé sans autorisation
- les identités peuvent être compromisées
- des anomalies peuvent rester invisibles
- une panne peut devenir difficile à diagnostiquer

Pour un ERP, le risque n’est pas seulement technique. C’est un risque de confiance, de conformité et de continuité d’activité.

## 4. Ce que cela apporte à l’entreprise

Une sécurité bien pensée donne :
- confiance aux utilisateurs
- meilleure gouvernance des accès
- meilleure protection des données
- gestion plus fiable des opérations
- capacité à réagir rapidement en cas d’incident
- meilleure maturité pour un environnement en production

## 5. Bonnes pratiques de référence

Nous avons pris les bonnes pratiques suivantes :
- vérifier les droits côté serveur
- never trust client-side only
- protéger les routes sensibles
- limiter les tentatives de connexion
- séparer les organisations
- auditer les actions critiques
- sécuriser les secrets et les variables d’environnement
- ne pas utiliser SQLite en production
- mettre en place monitoring et sauvegardes

## 6. En une phrase

L’ERP ne doit pas seulement “marcher”, il doit aussi être digne de confiance.

C’est pour cela que la sécurité est aujourd’hui un axe majeur du projet : parce qu’une bonne gestion ne vaut rien sans protection des données et des accès.
