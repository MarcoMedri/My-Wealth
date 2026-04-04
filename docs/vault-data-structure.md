# Struttura Dati del Vault - MyWealth Desktop

Questo documento descrive nel dettaglio la struttura dati del vault di MyWealth Desktop, specificando tutti i file JSON e i loro campi.

## Panoramica

Il vault è una cartella locale scelta dall'utente che contiene tutti i dati finanziari dell'applicazione in formato JSON. Questa architettura "local-first" permette all'utente di avere il pieno controllo dei propri dati.

**Importante**: Tutti i valori monetari sono memorizzati come **interi in centesimi** per evitare errori di precisione floating-point.

Esempio:
- €10.99 → 1099 centesimi
- $5.00 → 500 centesimi
- ¥1000 → 1000 (JPY non ha unità minori)

---

## Struttura delle Cartelle

```
/vault-path/
├── settings.json              # Impostazioni dell'applicazione (NON nel vault, ma in userData)
├── accounts.json              # Conti finanziari
├── categories.json            # Categorie per transazioni
├── brokers.json               # Broker/Istituti finanziari
├── assets.json                # Asset finanziari (Azioni, ETF, Crypto)
├── holdings.json              # Posizioni possedute dall'utente
├── trades.json                # Storico operazioni buy/sell
├── dividends.json             # Dividendi ricevuti
├── properties.json            # Immobili
├── collectibles.json          # Oggetti da collezione
├── insurance.json             # Polizze assicurative
├── deposits.json              # Conti deposito
├── snapshots.json             # Snapshot del patrimonio netto
├── workspace.json             # Preferenze workspace UI
├── logos/                     # Loghi broker personalizzati
└── transactions/              # Cartella transazioni
    └── YYYY/                  # Anno
        └── MM/                # Mese
            └── transactions.json
```

---

## 1. accounts.json

**Percorso**: `{vault}/accounts.json`

**Descrizione**: Contiene tutti i conti finanziari (conti correnti, carte di credito, conti investimento, etc.)

### Struttura File

```json
{
  "version": 1,
  "accounts": [
    {
      "id": "uuid",
      "brokerId": "uuid",              // Opzionale - collegamento a broker
      "name": "string",                // Nome visualizzato (max 100 caratteri)
      "type": "checking|savings|credit|investment|cash|loan|deposit|other",
      "currency": "EUR",               // Codice ISO 4217 (3 lettere)
      "initialBalance": 0,             // Saldo iniziale in centesimi
      "manualBalance": 0,              // Opzionale - override manuale del saldo
      "manualBalanceDate": "2024-01-01T00:00:00.000Z", // Opzionale
      "color": "#6366f1",              // Colore hex per UI
      "icon": "wallet",                // Opzionale - nome icona Lucide
      "isArchived": false,             // Nasconde account ma lo preserva
      "sortOrder": 0,                  // Ordinamento UI
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `brokerId` | UUID | ❌ | Collegamento al broker |
| `name` | string | ✅ | Nome account (1-100 caratteri) |
| `type` | enum | ✅ | Tipo di conto |
| `currency` | string | ✅ | Codice valuta ISO 4217 |
| `initialBalance` | integer | ✅ | Saldo iniziale in centesimi (default: 0) |
| `manualBalance` | integer | ❌ | Override manuale del saldo calcolato |
| `manualBalanceDate` | ISO Date | ❌ | Data impostazione manuale |
| `color` | string | ✅ | Colore hex formato #RRGGBB (default: #6366f1) |
| `icon` | string | ❌ | Nome icona Lucide |
| `isArchived` | boolean | ✅ | Se true, nasconde l'account (default: false) |
| `sortOrder` | integer | ✅ | Ordinamento UI (default: 0) |
| `createdAt` | ISO Date | ✅ | Data creazione |
| `updatedAt` | ISO Date | ✅ | Data ultimo aggiornamento |

---

## 2. categories.json

**Percorso**: `{vault}/categories.json`

**Descrizione**: Categorie per organizzare le transazioni (entrate/uscite). Supporta gerarchie tramite `parentId`.

### Struttura File

```json
{
  "version": 1,
  "categories": [
    {
      "id": "uuid",
      "name": "string",
      "type": "income|expense",
      "parentId": null,                // Opzionale - per sottocategorie
      "icon": "tag",
      "color": "#6366f1",
      "sortOrder": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `name` | string | ✅ | Nome categoria (1-100 caratteri) |
| `type` | enum | ✅ | `income` o `expense` |
| `parentId` | UUID\|null | ✅ | ID categoria padre (null per top-level) |
| `icon` | string | ✅ | Nome icona Lucide (default: "tag") |
| `color` | string | ✅ | Colore hex (default: #6366f1) |
| `sortOrder` | integer | ✅ | Ordinamento UI (default: 0) |
| `createdAt` | ISO Date | ✅ | Data creazione |
| `updatedAt` | ISO Date | ✅ | Data ultimo aggiornamento |

---

## 3. brokers.json

**Percorso**: `{vault}/brokers.json`

**Descrizione**: Broker e istituzioni finanziarie (banche, broker, exchange crypto, assicurazioni).

### Struttura File

```json
{
  "version": 1,
  "brokers": [
    {
      "id": "uuid",
      "name": "string",
      "type": "bank|broker|crypto_exchange|insurance|other",
      "color": "#6366f1",
      "icon": "building",              // Opzionale - emoji o nome icona
      "website": "https://example.com", // Opzionale
      "logoPath": "logos/uuid.png",    // Opzionale - path relativo
      "sortOrder": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `name` | string | ✅ | Nome broker (1-100 caratteri) |
| `type` | enum | ✅ | Tipo istituzione |
| `color` | string | ✅ | Colore hex (default: #6366f1) |
| `icon` | string | ❌ | Emoji o nome icona Lucide |
| `website` | string | ❌ | URL sito web |
| `logoPath` | string | ❌ | Path relativo al logo (es. "logos/uuid.png") |
| `sortOrder` | integer | ✅ | Ordinamento UI (default: 0) |
| `createdAt` | ISO Date | ✅ | Data creazione |
| `updatedAt` | ISO Date | ✅ | Data ultimo aggiornamento |

---

## 4. assets.json

**Percorso**: `{vault}/assets.json`

**Descrizione**: Asset finanziari (azioni, ETF, crypto, obbligazioni, fondi).

### Struttura File

```json
{
  "version": 1,
  "assets": [
    {
      "id": "uuid",
      "symbol": "AAPL",
      "isin": "US0378331005",          // Opzionale
      "name": "Apple Inc.",
      "type": "stock|etf|crypto|bond|fund|insurance|other",
      "currency": "USD",
      "currentPrice": 15000,           // in centesimi
      "previousClose": 14900,          // Opzionale - chiusura precedente
      "priceHistory": [                // Opzionale - storico prezzi
        {
          "date": "2024-01-01",
          "price": 14500
        }
      ],
      "lastUpdated": "2024-01-01T00:00:00.000Z",
      "autoRefresh": true,             // Abilita auto-refresh Yahoo Finance
      "metadata": {                    // Opzionale
        "sector": "Technology",
        "industry": "Consumer Electronics",
        "region": "North America",
        "country": "United States",
        "exchange": "NASDAQ",
        "description": "Apple designs..."
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `symbol` | string | ✅ | Ticker/Symbol (es. "AAPL") |
| `isin` | string | ❌ | Codice ISIN |
| `name` | string | ✅ | Nome asset |
| `type` | enum | ✅ | Tipo asset |
| `currency` | string | ✅ | Codice valuta ISO 4217 |
| `currentPrice` | integer | ✅ | Prezzo corrente in centesimi |
| `previousClose` | integer | ❌ | Chiusura precedente per calcolo variazione |
| `priceHistory` | array | ❌ | Storico prezzi |
| `lastUpdated` | ISO Date | ✅ | Data ultimo aggiornamento prezzo |
| `autoRefresh` | boolean | ✅ | Abilita refresh automatico (default: true) |
| `metadata` | object | ❌ | Metadati asset (settore, paese, etc.) |
| `createdAt` | ISO Date | ✅ | Data creazione |
| `updatedAt` | ISO Date | ✅ | Data ultimo aggiornamento |

---

## 5. holdings.json

**Percorso**: `{vault}/holdings.json`

**Descrizione**: Posizioni possedute dall'utente (quantità di asset).

### Struttura File

```json
{
  "version": 1,
  "holdings": [
    {
      "id": "uuid",
      "accountId": "uuid",
      "brokerId": "uuid",              // Opzionale
      "assetId": "uuid",
      "quantity": 10.5,                // Può essere decimale
      "averageBuyPrice": 14000,        // Prezzo medio acquisto in centesimi
      "taxRate": 26,                   // Aliquota fiscale capital gains (%)
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `accountId` | UUID | ✅ | Collegamento a account broker |
| `brokerId` | UUID | ❌ | Collegamento diretto a broker |
| `assetId` | UUID | ✅ | Collegamento ad asset |
| `quantity` | number | ✅ | Quantità posseduta (decimale OK) |
| `averageBuyPrice` | integer | ✅ | Prezzo medio acquisto in centesimi |
| `taxRate` | number | ✅ | Aliquota fiscale 0-100% (default: 26) |
| `createdAt` | ISO Date | ✅ | Data creazione |
| `updatedAt` | ISO Date | ✅ | Data ultimo aggiornamento |

---

## 6. trades.json

**Percorso**: `{vault}/trades.json`

**Descrizione**: Storico delle operazioni di acquisto/vendita per tracking completo.

### Struttura File

```json
{
  "version": 1,
  "trades": [
    {
      "id": "uuid",
      "type": "buy|sell",
      "assetId": "uuid",
      "accountId": "uuid",
      "quantity": 10,
      "pricePerUnit": 14000,           // in centesimi
      "fees": 500,                     // commissioni in centesimi
      "tax": 26,                       // Opzionale - aliquota fiscale
      "date": "2024-01-01",
      "realizedGain": 1000,            // Opzionale - solo per vendite
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `type` | enum | ✅ | `buy` o `sell` |
| `assetId` | UUID | ✅ | Collegamento ad asset |
| `accountId` | UUID | ✅ | Collegamento a account |
| `quantity` | number | ✅ | Quantità scambiata |
| `pricePerUnit` | integer | ✅ | Prezzo unitario in centesimi |
| `fees` | integer | ✅ | Commissioni in centesimi (default: 0) |
| `tax` | number | ❌ | Aliquota fiscale |
| `date` | ISO Date | ✅ | Data operazione |
| `realizedGain` | integer | ❌ | Gain/Loss realizzato (solo vendite) |
| `createdAt` | ISO Date | ✅ | Data creazione record |

---

## 7. dividends.json

**Percorso**: `{vault}/dividends.json`

**Descrizione**: Dividendi ricevuti.

### Struttura File

```json
{
  "version": 1,
  "dividends": [
    {
      "id": "uuid",
      "assetId": "uuid",
      "accountId": "uuid",
      "date": "2024-01-01",
      "amountPerShare": 50,            // in centesimi per azione
      "totalAmount": 500,              // totale ricevuto in centesimi
      "currency": "USD",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `assetId` | UUID | ✅ | Collegamento ad asset |
| `accountId` | UUID | ✅ | Collegamento a account |
| `date` | ISO Date | ✅ | Data pagamento dividendo |
| `amountPerShare` | integer | ✅ | Importo per azione in centesimi |
| `totalAmount` | integer | ✅ | Totale ricevuto in centesimi |
| `currency` | string | ✅ | Codice valuta ISO 4217 |
| `createdAt` | ISO Date | ✅ | Data creazione record |

---

## 8. properties.json

**Percorso**: `{vault}/properties.json`

**Descrizione**: Immobili (abitazione principale, affitti, terreni, immobili commerciali).

### Struttura File

```json
{
  "version": 1,
  "properties": [
    {
      "id": "uuid",
      "name": "Appartamento Milano",
      "type": "residence|rental|vacation|land|commercial|other",
      "address": "Via Roma, 1",        // Opzionale
      "purchaseDate": "2020-01-01",    // Opzionale
      "purchasePrice": 30000000,       // Opzionale - in centesimi
      "currentValue": 35000000,        // in centesimi
      "lastValuationDate": "2024-01-01",
      "currency": "EUR",
      "taxRate": 0,                    // Aliquota capital gains (%)
      "squareMeters": 80,              // Opzionale
      "notes": "note...",              // Opzionale
      "imageUrl": "path/to/image",     // Opzionale
      "mortgageAccountId": "uuid",     // Opzionale - link a mutuo
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `name` | string | ✅ | Nome descrittivo immobile |
| `type` | enum | ✅ | Tipo immobile |
| `address` | string | ❌ | Indirizzo |
| `purchaseDate` | ISO Date | ❌ | Data acquisto |
| `purchasePrice` | integer | ❌ | Prezzo acquisto in centesimi |
| `currentValue` | integer | ✅ | Valore corrente stimato in centesimi |
| `lastValuationDate` | ISO Date | ✅ | Data ultima valutazione |
| `currency` | string | ✅ | Codice valuta ISO 4217 |
| `taxRate` | number | ✅ | Aliquota fiscale 0-100% (default: 0) |
| `squareMeters` | number | ❌ | Superficie in mq |
| `notes` | string | ❌ | Note |
| `imageUrl` | string | ❌ | Path locale immagine |
| `mortgageAccountId` | UUID | ❌ | Collegamento a account mutuo |
| `createdAt` | ISO Date | ✅ | Data creazione |
| `updatedAt` | ISO Date | ✅ | Data ultimo aggiornamento |

---

## 9. collectibles.json

**Percorso**: `{vault}/collectibles.json`

**Descrizione**: Oggetti da collezione (orologi, arte, vini, gioielli, veicoli d'epoca, carte, monete).

### Struttura File

```json
{
  "version": 1,
  "collectibles": [
    {
      "id": "uuid",
      "name": "Rolex Submariner",
      "type": "watch|art|wine|jewelry|vehicle|trading_card|coin|other",
      "description": "descrizione...",  // Opzionale
      "purchaseDate": "2020-01-01",    // Opzionale
      "purchasePrice": 800000,         // Opzionale - in centesimi
      "currentValue": 1200000,         // in centesimi
      "taxRate": 0,                    // Aliquota capital gains (%)
      "currency": "EUR",
      "imageUrl": "path/to/image",     // Opzionale
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `name` | string | ✅ | Nome oggetto |
| `type` | enum | ✅ | Tipo oggetto |
| `description` | string | ❌ | Descrizione dettagliata |
| `purchaseDate` | ISO Date | ❌ | Data acquisto |
| `purchasePrice` | integer | ❌ | Prezzo acquisto in centesimi |
| `currentValue` | integer | ✅ | Valore corrente in centesimi |
| `taxRate` | number | ✅ | Aliquota fiscale 0-100% (default: 0) |
| `currency` | string | ✅ | Codice valuta ISO 4217 |
| `imageUrl` | string | ❌ | Path locale immagine |
| `createdAt` | ISO Date | ✅ | Data creazione |
| `updatedAt` | ISO Date | ✅ | Data ultimo aggiornamento |

---

## 10. insurance.json

**Percorso**: `{vault}/insurance.json`

**Descrizione**: Polizze assicurative (vita, auto, salute, casa, altro).

### Struttura File

```json
{
  "version": 1,
  "policies": [
    {
      "id": "uuid",
      "name": "Polizza Auto",
      "provider": "Generali",          // Opzionale
      "policyNumber": "POL123456",     // Opzionale
      "contactInfo": "+39 123 456",    // Opzionale
      "type": "life|auto|health|home|other",
      "premiumAmount": 50000,          // Premio in centesimi
      "premiumPeriod": "monthly|quarterly|semiannual|annual|one-time",
      "nextPaymentDate": "2024-02-01", // Opzionale
      "startDate": "2024-01-01",
      "endDate": "2025-01-01",         // Opzionale
      "brokerId": "uuid",              // Opzionale
      "autoRenewal": false,
      "coverageAmount": 10000000,      // Opzionale - massimale in centesimi
      "deductible": 50000,             // Opzionale - franchigia in centesimi
      "currentValue": 0,               // per polizze investment-linked
      "currency": "EUR",
      "insuredEntity": "AB123CD",      // Opzionale - targa, indirizzo, etc.
      "notes": "note...",              // Opzionale
      "accountId": "uuid",             // Opzionale - account IBAN
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `name` | string | ✅ | Nome polizza (1-100 caratteri) |
| `provider` | string | ❌ | Compagnia assicurativa |
| `policyNumber` | string | ❌ | Numero polizza |
| `contactInfo` | string | ❌ | Contatti emergenza |
| `type` | string | ✅ | Tipo polizza |
| `premiumAmount` | integer | ✅ | Premio in centesimi |
| `premiumPeriod` | enum | ✅ | Periodicità pagamento |
| `nextPaymentDate` | ISO Date | ❌ | Prossimo pagamento |
| `startDate` | ISO Date | ✅ | Data inizio copertura |
| `endDate` | ISO Date | ❌ | Data fine copertura |
| `brokerId` | UUID | ❌ | Collegamento a broker |
| `autoRenewal` | boolean | ✅ | Rinnovo automatico (default: false) |
| `coverageAmount` | integer | ❌ | Massimale in centesimi |
| `deductible` | integer | ❌ | Franchigia in centesimi |
| `currentValue` | integer | ✅ | Valore corrente (polizze invest.) (default: 0) |
| `currency` | string | ✅ | Codice valuta ISO 4217 |
| `insuredEntity` | string | ❌ | Entità assicurata (targa, indirizzo) |
| `notes` | string | ❌ | Note |
| `accountId` | UUID | ❌ | Account per addebito |
| `createdAt` | ISO Date | ✅ | Data creazione |
| `updatedAt` | ISO Date | ✅ | Data ultimo aggiornamento |

---

## 11. deposits.json

**Percorso**: `{vault}/deposits.json`

**Descrizione**: Conti deposito vincolati/svincolati.

### Struttura File

```json
{
  "version": 1,
  "deposits": [
    {
      "id": "uuid",
      "name": "Conto Deposito XYZ",
      "brokerId": "uuid",              // Opzionale
      "principal": 1000000,            // Capitale iniziale in centesimi
      "grossRate": 4.5,                // Tasso lordo %
      "netRate": 3.33,                 // Tasso netto % (dopo tasse)
      "interestPeriodicity": "end|monthly|quarterly|semiannual|annual",
      "activationDate": "2024-01-01",
      "durationMonths": 12,
      "maturityDate": "2025-01-01",
      "constraintType": "free|locked|flexible",
      "currency": "EUR",
      "notes": "note...",              // Opzionale
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `name` | string | ✅ | Nome conto deposito (1-100 caratteri) |
| `brokerId` | string | ❌ | Collegamento a banca |
| `principal` | integer | ✅ | Capitale iniziale in centesimi |
| `grossRate` | number | ✅ | Tasso lordo % |
| `netRate` | number | ✅ | Tasso netto % (dopo tasse) |
| `interestPeriodicity` | enum | ✅ | Periodicità interessi |
| `activationDate` | ISO Date | ✅ | Data attivazione |
| `durationMonths` | integer | ✅ | Durata in mesi (> 0) |
| `maturityDate` | ISO Date | ✅ | Data scadenza |
| `constraintType` | enum | ✅ | Tipo vincolo (libero/vincolato/flessibile) |
| `currency` | string | ✅ | Codice valuta ISO 4217 |
| `notes` | string | ❌ | Note |
| `createdAt` | ISO Date | ✅ | Data creazione |
| `updatedAt` | ISO Date | ✅ | Data ultimo aggiornamento |

---

## 12. snapshots.json

**Percorso**: `{vault}/snapshots.json`

**Descrizione**: Snapshot del patrimonio netto per tracking storico.

### Struttura File

```json
{
  "version": 1,
  "snapshots": [
    {
      "id": "uuid",
      "date": "2024-01-01",
      "totalNetWorth": 10000000,       // in centesimi
      "currency": "EUR",
      "breakdown": {
        "cash": 200000,
        "investments": 500000,
        "realEstate": 7000000,
        "collectibles": 1000000,
        "insurance": 500000,
        "deposits": 800000
      },
      "unrealizedTax": 50000           // Tasse stimate su plusvalenze
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `id` | UUID | ✅ | Identificatore univoco |
| `date` | ISO Date | ✅ | Data snapshot |
| `totalNetWorth` | integer | ✅ | Patrimonio netto totale in centesimi |
| `currency` | string | ✅ | Codice valuta ISO 4217 |
| `breakdown` | object | ✅ | Breakdown per categoria |
| `breakdown.cash` | integer | ✅ | Liquidità |
| `breakdown.investments` | integer | ✅ | Investimenti |
| `breakdown.realEstate` | integer | ✅ | Immobili (default: 0) |
| `breakdown.collectibles` | integer | ✅ | Collezioni (default: 0) |
| `breakdown.insurance` | integer | ✅ | Assicurazioni (default: 0) |
| `breakdown.deposits` | integer | ✅ | Depositi (default: 0) |
| `unrealizedTax` | integer | ✅ | Tasse stimate su plusvalenze (default: 0) |

---

## 13. workspace.json

**Percorso**: `{vault}/workspace.json`

**Descrizione**: Preferenze UI e workspace dell'utente.

### Struttura File

```json
{
  "activeView": "dashboard",          // Opzionale
  "dateFilter": "2024-01",            // Opzionale - "YYYY-MM" o "all"
  "layout": {                         // Opzionale
    "leftSidebarCollapsed": false,
    "leftSidebarWidth": 256,          // Opzionale - px (200-600)
    "rightSidebarCollapsed": false,
    "rightSidebarWidth": 256          // Opzionale - px (200-600)
  },
  "autoRefreshOnSnapshot": null,      // Opzionale - true|false|null
  "defaultViewMode": "net",           // Opzionale - "net"|"gross"
  "holdingsTable": {                  // Opzionale
    "visibleColumns": ["symbol", "quantity", "value"]
  },
  "uiDensity": "normal",              // Opzionale - "compact"|"normal"|"expanded"
  "investmentsDashboard": {           // Opzionale
    "dateRange": "YTD",
    "includeClosed": false
  },
  "accountsDashboard": {              // Opzionale
    "dateRange": "1M",
    "selectedAccountIds": ["uuid1", "uuid2"]
  },
  "taxDefaults": {
    "stock": 26,
    "etf": 26,
    "crypto": 26,
    "bond": 12.5,
    "fund": 26,
    "residence": 0,
    "rental": 0,
    "collectible": 0
  },
  "performanceMetricsPeriod": "YTD"   // Opzionale - "YTD"|"1M"|"3M"|"6M"|"1Y"|"3Y"|"ALL"
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `activeView` | string | ❌ | Ultima vista attiva |
| `dateFilter` | string | ❌ | Filtro mese (YYYY-MM o "all") |
| `layout` | object | ❌ | Preferenze layout |
| `autoRefreshOnSnapshot` | boolean\|null | ❌ | Comportamento refresh auto |
| `defaultViewMode` | enum | ❌ | Vista default netto/lordo |
| `holdingsTable` | object | ❌ | Colonne visibili tabella holdings |
| `uiDensity` | enum | ❌ | Densità UI (default: "normal") |
| `investmentsDashboard` | object | ❌ | Preferenze dashboard investimenti |
| `accountsDashboard` | object | ❌ | Preferenze dashboard accounts |
| `taxDefaults` | object | ✅ | Aliquote fiscali default per tipo |
| `performanceMetricsPeriod` | enum | ❌ | Periodo metriche performance (default: "YTD") |

---

## 14. transactions/YYYY/MM/transactions.json

**Percorso**: `{vault}/transactions/YYYY/MM/transactions.json`

**Descrizione**: Transazioni mensili (entrate, uscite, trasferimenti).

### Struttura File

```json
{
  "version": 1,
  "year": 2024,
  "month": 1,
  "transactions": [
    {
      "id": "uuid",
      "type": "income|expense|transfer",
      "date": "2024-01-15",
      "payee": "Stipendio",
      "amount": 200000,                // in centesimi (sempre positivo)
      "currency": "EUR",
      "accountId": "uuid",
      "brokerId": "uuid",              // Opzionale
      "categoryId": "uuid",            // Opzionale se ci sono splits
      "toAccountId": "uuid",           // Opzionale - solo per transfer
      "splits": [                      // Opzionale - per split transactions
        {
          "categoryId": "uuid",
          "amount": 10000,             // in centesimi
          "memo": "note..."            // Opzionale
        }
      ],
      "status": "pending|cleared",
      "notes": "note...",
      "tags": ["tag1", "tag2"],
      "isReconciled": false,
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `version` | integer | ✅ | Versione schema (1) |
| `year` | integer | ✅ | Anno (1900-2100) |
| `month` | integer | ✅ | Mese (1-12) |
| `transactions` | array | ✅ | Array transazioni |
| `id` | UUID | ✅ | Identificatore univoco |
| `type` | enum | ✅ | Tipo transazione |
| `date` | ISO Date | ✅ | Data transazione |
| `payee` | string | ✅ | Beneficiario/Descrizione (max 200) (default: "") |
| `amount` | integer | ✅ | Importo in centesimi (≥ 0) |
| `currency` | string | ✅ | Codice valuta ISO 4217 |
| `accountId` | UUID | ✅ | Collegamento a account |
| `brokerId` | UUID | ❌ | Collegamento a broker |
| `categoryId` | UUID\|null | ✅ | Categoria (null se splits o transfer) |
| `toAccountId` | UUID\|null | ✅ | Account destinazione (solo transfer) |
| `splits` | array | ✅ | Split categorie (default: []) |
| `status` | enum | ✅ | Stato (default: "cleared") |
| `notes` | string | ✅ | Note (max 2000) (default: "") |
| `tags` | array | ✅ | Tag (max 50 caratteri ciascuno) (default: []) |
| `isReconciled` | boolean | ✅ | Riconciliato (default: false) |
| `createdAt` | ISO Date | ✅ | Data creazione |
| `updatedAt` | ISO Date | ✅ | Data ultimo aggiornamento |

### Regole di Validazione Transazioni

1. **Splits**: Se presente, la somma degli split DEVE essere uguale all'amount
2. **Transfer**: Se type = "transfer", toAccountId DEVE essere valorizzato
3. **Category**: Le transazioni (esclusi transfer) devono avere categoryId O splits (eccezione: tag "imported")

---

## 15. settings.json

**Percorso**: `{userData}/settings.json` (NON nel vault, ma in userData di Electron)

**Descrizione**: Impostazioni globali applicazione.

### Struttura File

```json
{
  "vaultPath": "/path/to/vault",      // null se non inizializzato
  "theme": "system|light|dark",
  "lastAppVersion": "1.0.0",
  "lastModified": "2024-01-01T00:00:00.000Z",
  "hasCompletedTutorial": false,
  "windowBounds": {                   // Opzionale
    "x": 100,                         // Opzionale
    "y": 100,                         // Opzionale
    "width": 1200,                    // min 800, default 1200
    "height": 800,                    // min 600, default 800
    "isMaximized": false
  }
}
```

### Campi Dettagliati

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `vaultPath` | string\|null | ✅ | Path al vault (null se non inizializzato) |
| `theme` | enum | ✅ | Tema UI (default: "system") |
| `lastAppVersion` | string | ✅ | Ultima versione app |
| `lastModified` | ISO Date | ✅ | Data ultima modifica |
| `hasCompletedTutorial` | boolean | ✅ | Tutorial completato (default: false) |
| `windowBounds` | object | ❌ | Dimensioni finestra |

---

## Note Tecniche

### Valute Supportate

- EUR (Euro) - €
- USD (US Dollar) - $
- GBP (British Pound) - £
- CHF (Swiss Franc) - CHF
- JPY (Japanese Yen) - ¥ (senza decimali)
- CAD (Canadian Dollar) - C$
- AUD (Australian Dollar) - A$
- CNY (Chinese Yuan) - ¥

### Formato Date

Tutte le date seguono ISO 8601:
- Solo data: `YYYY-MM-DD` (es. "2024-01-15")
- Data e ora: `YYYY-MM-DDTHH:mm:ss.sssZ` (es. "2024-01-15T14:30:00.000Z")

### UUID

Tutti gli ID sono UUID v4 in formato standard: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

### Validazione

Tutti i file JSON vengono validati tramite Zod schemas al caricamento e salvataggio per garantire l'integrità dei dati.

### Backup

L'applicazione crea automaticamente backup compressi del vault nella cartella `.backups` all'interno del vault stesso.

---

**Ultima modifica**: 2024-01-29  
**Versione documento**: 1.0
