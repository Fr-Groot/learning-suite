# Politique de signature du code · Code signing policy

*Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).*

> Statut : la candidature au programme open source de SignPath Foundation est en préparation.
> Tant qu'elle n'est pas acceptée, les installateurs sont publiés **non signés**.

## Ce qui est signé
Uniquement les installateurs de **Learning Suite Studio** (`.exe` et `.msi`) publiés dans les
[Releases](../../releases) de ce dépôt. Ils sont construits par le workflow public
[`release.yml`](../.github/workflows/release.yml) à partir du code source de ce dépôt, sur les
serveurs de GitHub, puis signés par SignPath. Aucun fichier construit sur un poste personnel n'est signé.
Les sommes SHA256 de chaque fichier sont publiées dans `SHA256SUMS.txt`.

## Rôles
| Rôle | Personne |
| --- | --- |
| Auteur, relecteur et approbateur des publications | [Fr-Groot](https://github.com/Fr-Groot) |

Chaque demande de signature est approuvée manuellement. Tous les membres utilisent
l'authentification à deux facteurs (GitHub et SignPath).

## Vie privée
Learning Suite Studio ne transmet **aucune donnée** : pas de télémétrie, pas de compte, pas
d'appel réseau en dehors des actions explicites de l'utilisateur (par ex. ouvrir un lien).
Les modules créés restent sur l'ordinateur de l'auteur.

---

**English.** Only the Learning Suite Studio installers published in this repository's Releases are
signed. They are built from this public source by the public GitHub Actions workflow, then signed by
SignPath. Every signing request is approved manually by the maintainer (Fr-Groot). The app collects
no data and sends nothing over the network.
