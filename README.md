# Registre CABA

Application de suivi des dettes, paiements, billets d'avion et marchandise
(rotations Algérie–Chine). Installable sur téléphone, données partagées en
direct entre plusieurs comptes.

## Ce qu'il y a à faire avant que ça marche

L'application est écrite et prête, mais elle a besoin de deux services
externes gratuits pour fonctionner : **Firebase** (la base de données
partagée) et **Anthropic** (la lecture automatique des bons par IA — payante
à l'usage, quelques centimes par photo scannée). Ensuite elle se déploie sur
**Vercel** (hébergement gratuit).

Compte ~20-30 minutes pour tout faire une première fois, en suivant les
étapes ci-dessous dans l'ordre.

### 1. Créer le projet Firebase (base de données partagée)

1. Va sur [console.firebase.google.com](https://console.firebase.google.com)
   et connecte-toi avec un compte Google.
2. **Ajouter un projet** → donne-lui un nom (ex. "registre-caba") → tu peux
   désactiver Google Analytics (pas nécessaire) → **Créer le projet**.
3. Dans le menu de gauche : **Build → Firestore Database** → **Créer une
   base de données** → choisis une région proche (ex. `eur3` si tu es en
   Algérie/Europe) → démarre en **mode production**.
4. Une fois créée, va dans l'onglet **Règles** de Firestore, remplace tout
   le contenu par celui du fichier [`firestore.rules`](./firestore.rules) de
   ce dépôt, puis **Publier**.
5. Retourne dans **Paramètres du projet** (icône ⚙️ en haut à gauche) →
   onglet **Général** → section **Vos applications** → clique l'icône
   `</>` (Web) → donne un nom (ex. "web") → **Enregistrer l'application**
   (pas besoin de Firebase Hosting).
6. Firebase affiche un objet `firebaseConfig` avec des valeurs comme
   `apiKey`, `authDomain`, `projectId`… **Garde cette page ouverte**, tu en
   auras besoin à l'étape 3.

### 2. Créer la clé API Anthropic (lecture des bons par IA)

1. Va sur [console.anthropic.com](https://console.anthropic.com) et crée un
   compte.
2. Ajoute un moyen de paiement (**Billing**) — la lecture d'un bon coûte
   une fraction de centime à quelques centimes selon la taille de la photo.
3. Va dans **API Keys** → **Create Key** → copie la clé (elle commence par
   `sk-ant-...`, et ne s'affiche qu'une seule fois).

### 3. Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec ton compte
   GitHub (celui qui a accès à ce dépôt `Y-M`).
2. **Add New… → Project** → choisis le dépôt `Y-M` → **Import**.
3. Avant de cliquer sur *Deploy*, ouvre **Environment Variables** et ajoute
   ces 7 variables (valeurs prises dans les étapes 1 et 2) :

   | Nom                              | Valeur                              |
   |-----------------------------------|-------------------------------------|
   | `VITE_FIREBASE_API_KEY`           | `apiKey` de Firebase                |
   | `VITE_FIREBASE_AUTH_DOMAIN`       | `authDomain` de Firebase            |
   | `VITE_FIREBASE_PROJECT_ID`        | `projectId` de Firebase             |
   | `VITE_FIREBASE_STORAGE_BUCKET`    | `storageBucket` de Firebase         |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` de Firebase   |
   | `VITE_FIREBASE_APP_ID`            | `appId` de Firebase                 |
   | `ANTHROPIC_API_KEY`               | la clé `sk-ant-...` d'Anthropic     |

4. Clique **Deploy**. Après 1-2 minutes, Vercel donne un lien du type
   `https://y-m-xxxx.vercel.app` — c'est l'adresse définitive de
   l'application (à partager avec ton associé).

### 4. Créer les comptes (toi, puis ton associé)

La connexion se fait maintenant avec Firebase Authentication (email + mot
de passe) — les comptes se créent depuis la console Firebase, pas depuis
l'appli :

1. Dans la [console Firebase](https://console.firebase.google.com), ouvre
   ton projet → menu **Build → Authentication**.
2. Onglet **Sign-in method** → active la méthode **Email/Password** si ce
   n'est pas déjà fait.
3. Onglet **Users** → **Add user** → renseigne ton email et un mot de
   passe. Répète pour créer le compte de ton associé.
4. Transmets-lui son email et son mot de passe (message, appel…).

### 5. Installer sur les deux téléphones

**iPhone (Safari) :**
Ouvre le lien Vercel → bouton **Partager** (le carré avec la flèche) →
**Sur l'écran d'accueil** → **Ajouter**. Une icône Registre CABA apparaît
sur l'écran d'accueil et ouvre l'appli en plein écran, sans barre de
navigateur.

**Android (Chrome) :**
Ouvre le lien Vercel → menu ⋮ en haut à droite → **Installer l'application**
(ou **Ajouter à l'écran d'accueil**) → **Installer**.

Chacun se connecte ensuite avec son propre email Firebase. Les deux
téléphones partagent la même base de données : ce que l'un ajoute apparaît
chez l'autre automatiquement, sans recharger.

## Développement local

```bash
npm install
cp .env.example .env.local   # renseigne les mêmes valeurs que ci-dessus
npm run dev
```

Sans configuration Firebase (`.env.local` vide), les données retombent sur
le stockage du navigateur — pratique pour tester une modification. La
connexion, elle, nécessite toujours un vrai projet Firebase (Firebase
Authentication n'a pas de secours hors-ligne).

## Notes

- **Sécurité** : la connexion passe par Firebase Authentication (email +
  mot de passe), et les règles Firestore n'autorisent l'accès qu'aux
  utilisateurs connectés (`request.auth != null`). Les comptes se créent
  et se suppriment depuis la console Firebase (Authentication → Users).
- **Lecture IA des bons** : la fonction serveur (`api/scan-bon.js`) vérifie
  le jeton Firebase de l'appelant avant d'interroger l'API Anthropic —
  seuls les utilisateurs connectés peuvent l'utiliser.
- **Photos jointes** : automatiquement redimensionnées avant sauvegarde
  (chaque document Firestore est limité à 1 Mo). Les PDF joints doivent
  faire moins de 500 Ko.
- **Lecture IA des bons** : dépense du crédit sur ton compte Anthropic à
  chaque photo scannée. Si `ANTHROPIC_API_KEY` n'est pas configurée, le
  bouton de lecture affiche simplement une erreur — le reste de l'appli
  fonctionne normalement.
