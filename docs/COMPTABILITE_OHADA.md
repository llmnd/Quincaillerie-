# Comptabilite et plan OHADA

## 1. Principe de fonctionnement

L'utilisateur saisit d'abord l'operation commerciale dans le module **Ventes**. L'ERP met ensuite a jour les donnees liees et genere l'ecriture comptable dans la meme transaction.

Pour une vente de 100 000 FCFA :

1. La vente est enregistree.
2. Le stock vendu est diminue.
3. Une operation de caisse est creee.
4. Une ecriture est ajoutee au journal des ventes.
5. Le tableau de bord et les etats financiers utilisent les donnees du grand livre.

L'ecriture automatique actuelle est :

```text
Vente payee comptant :
  Debit  571 - Caisse                  100 000
  Credit 701 - Ventes de marchandises  100 000

Vente a recouvrer :
  Debit  411 - Clients                 100 000
  Credit 701 - Ventes de marchandises  100 000
```

Une ecriture est rattachee a la vente par `source_type = sale` et `source_id`. Cette liaison evite de creer deux fois la meme ecriture.

## 2. Facturation et TVA

Une facture peut etre creee a partir d'une vente. Si une taxe est selectionnee, le montant de TVA est calcule sur la facture et comptabilise ainsi :

```text
Debit  411 - Clients                 Montant TTC
Credit 701 - Ventes de marchandises  Montant HT
Credit 4431 - TVA facturee           Montant TVA
```

La saisie manuelle reste utile pour les operations qui ne viennent pas d'une vente : loyer, salaires, frais bancaires, amortissements, apports, retraits et corrections.

## 3. Plan OHADA / SYSCOHADA

Le plan comptable est organise par classes :

| Classe | Contenu principal |
| --- | --- |
| 1 | Ressources durables, capitaux et dettes financieres |
| 2 | Immobilisations |
| 3 | Stocks et encours |
| 4 | Tiers : clients, fournisseurs, personnel, Etat |
| 5 | Tresorerie : caisse et banques |
| 6 | Charges |
| 7 | Produits et chiffre d'affaires |
| 8 | Autres charges et autres produits |
| 9 | Comptabilite analytique et engagements, selon le besoin |

Le socle comptable de l'ERP cree actuellement ces comptes par organisation :

- `411` : Clients
- `4431` : TVA facturee
- `571` : Caisse
- `701` : Ventes de marchandises

Les comptes peuvent ensuite etre completes ou adaptes par l'administrateur selon l'activite et le parametrage OHADA de l'entreprise.

## 4. Etats produits

Les ecritures alimentent :

- le journal comptable ;
- la balance des comptes ;
- le bilan ;
- le compte de resultat ;
- l'etat de TVA ;
- les indicateurs et graphiques du tableau de bord.

Les graphiques doivent donc etre lus comme des syntheses des ventes, des ecritures et des soldes reels, et non comme des valeurs saisies manuellement.

## 5. Evolution prevue

Les prochaines regles comptables peuvent couvrir les achats, les fournisseurs, les charges, la variation de stock, les banques et les immobilisations. Chaque regle devra conserver le meme principe : une operation metier genere automatiquement une ecriture equilibree et traçable.
