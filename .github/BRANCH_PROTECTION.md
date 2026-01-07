# Branch Protection Setup Guide

## Configurazione Branch Protection per `main`

Per proteggere il branch `main` e garantire qualità del codice, segui questi passi su GitHub:

### 1. Accedi alle impostazioni del repository

1. Vai su https://github.com/MarcoMedri/My-Wealth
2. Clicca su **Settings** (Impostazioni)
3. Nel menu laterale, clicca su **Branches** sotto "Code and automation"

### 2. Aggiungi Branch Protection Rule

1. Clicca su **Add branch protection rule**
2. In "Branch name pattern" inserisci: `main`

### 3. Configura le protezioni consigliate

Abilita le seguenti opzioni:

#### ✅ Require a pull request before merging
- Richiede che le modifiche passino attraverso una PR
- **Require approvals**: 1 (opzionale se lavori da solo)
- ✅ **Dismiss stale pull request approvals when new commits are pushed**

#### ✅ Require status checks to pass before merging
- ✅ **Require branches to be up to date before merging**
- Cerca e seleziona questi status checks:
  - `verify` (dal workflow pr-verify.yml)
  - `build-mac` (opzionale, solo se vuoi richiedere build completo)

#### ✅ Require conversation resolution before merging
- Assicura che tutti i commenti siano risolti prima del merge

#### ⚠️ Do not require status checks on creation (opzionale)
- Utile se sei l'unico maintainer

#### ❌ Require deployments to succeed before merging
- Non necessario per questo progetto

#### ✅ Lock branch (opzionale)
- Rende il branch read-only (solo tu puoi fare push)

#### ✅ Do not allow bypassing the above settings
- Applica le regole anche agli admin (consigliato)

### 4. Salva le modifiche

Clicca su **Create** o **Save changes** in fondo alla pagina.

## Flusso di lavoro risultante

### Per contributi esterni (Pull Request):

1. **Utente X crea una PR** → Workflow `pr-verify` parte automaticamente
   - ✅ Linting
   - ✅ Type checking  
   - ✅ Tests
   - ✅ Build verification (senza code signing)

2. **Review e approvazione** → Tu (o altri maintainer) revisionate il codice

3. **Merge su `main`** → Workflow `build-mac` parte
   - ✅ Build completo con code signing
   - ✅ Artifacts caricati su GitHub Actions (30 giorni)
   - ❌ Nessuna release automatica

### Per release ufficiali:

1. **Crei un tag** (es: `v1.3.0`)
   ```bash
   git tag -a v1.3.0 -m "Release v1.3.0 - Description"
   git push origin v1.3.0
   ```

2. **Workflow `build-mac` crea release**
   - ✅ Build completo con code signing
   - ✅ Notarizzazione (se abilitata)
   - ✅ **Release draft** creata automaticamente su GitHub
   - ✅ DMG e ZIP allegati alla release

## Vantaggi di questa configurazione

✅ **Sicurezza**: Solo codice verificato entra in `main`
✅ **Efficienza**: PR non sprecano risorse per code signing
✅ **Qualità**: Tutti i check devono passare prima del merge
✅ **Controllo**: Release manuali tramite tag, non automatiche
✅ **Trasparenza**: Ogni PR mostra chiaramente se passa i test

## Note importanti

- I **secrets** (certificati, password) sono accessibili solo dai workflow su `main` e tag
- Le PR da fork esterni **non hanno accesso ai secrets** (sicurezza GitHub)
- Il workflow `pr-verify` è leggero e veloce (< 5 minuti)
- Il workflow `build-mac` è completo ma più lento (~ 10-15 minuti)

## Comandi utili

```bash
# Verificare lo stato dei workflow
gh run list --workflow=pr-verify.yml
gh run list --workflow=build-mac.yml

# Creare una release
git tag -a v1.3.0 -m "Release v1.3.0"
git push origin v1.3.0

# Eliminare un tag (se necessario)
git tag -d v1.3.0
git push origin :refs/tags/v1.3.0
```
