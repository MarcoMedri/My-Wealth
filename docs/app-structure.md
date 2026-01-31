# Struttura e Funzioni di MyWealth

Questo documento descrive la gerarchia dei dati e le funzionalità principali delle pagine dell'applicazione.

## Gerarchia dei Dati

La struttura dei dati segue un modello gerarchico che riflette la gestione finanziaria reale:

1.  **Broker (Istituzioni Finanziarie)**
    *   Rappresentano le entità fisiche o digitali dove risiedono i tuoi capitali (es. Banca, Broker Online, Crypto Exchange).
    *   Contengono uno o più **Conti**.

2.  **Conti (Accounts)**
    *   Rappresentano i portafogli specifici all'interno di un Broker.
    *   Tipi supportati:
        *   **Conti Cash**: Conti correnti, risparmio, portafogli fisici.
        *   **Conti Titoli**: Conti dedicati agli investimenti.
        *   **Conti Deposito**: Investimenti a termine.
    *   Contengono **Investimenti** o transazioni di liquidità.

3.  **Investimenti (Assets & Holdings)**
    *   Rappresentano i singoli asset posseduti (es. Azioni, ETF, Criptovalute).
    *   Sono collegati a un **Conto Titoli** specifico.

---

## Funzioni delle Pagine

### 1. Dashboard Generale
*   **Visualizzazione Patrimonio**: Riepilogo in tempo reale del Net Worth (Lordo e Netto).
*   **Snapshot**: Funzione per scattare una "istantanea" del patrimonio per tracciarne l'evoluzione nel tempo.
*   **Analisi Performance**: Grafici dell'andamento storico e metriche di crescita.
*   **Quick Access**: Card riassuntive per classi di asset (Liquidità, Investimenti, Immobili, ecc.).

### 2. Gestione Conti (Accounts Dashboard)
*   **Tracking Liquidità**: Visualizzazione dei saldi e dei flussi di cassa.
*   **Monitoraggio Entrate/Uscite**: Confronto mensile tra guadagni e spese.
*   **Storico Transazioni**: Tabella dettagliata per consultare e filtrare ogni operazione.
*   **Filtri Avanzati**: Possibilità di filtrare per periodo temporale e per broker/conto.

### 3. Dashboard Investimenti
*   **Monitoraggio Portfolio**: Valore attuale, variazione giornaliera e rendimento totale (ROI).
*   **Asset Allocation**: Grafici a torta per distribuzione per Tipo di Asset, per Broker e per Area Geografica.
*   **Gestione Asset**: Funzioni per aggiungere nuovi acquisti (Buy) o registrare vendite (Sell).
*   **Aggiornamento Prezzi**: Integrazione con Yahoo Finance per il fetching automatico delle quotazioni.

### 4. Dettaglio Broker
*   **Focus Istituzione**: Vista dedicata a un singolo broker per vedere tutti i conti e gli asset associati.
*   **Gestione Operativa**: Caricamento di estratti conto (Import), aggiunta di transazioni e gestione conti deposito.
*   **Manutenzione**: Modifica delle informazioni del broker o eliminazione (con gestione dei dati associati).

### 5. Altre Sezioni Specifiche
*   **Immobili (Properties)**: Gestione del valore e dei mutui legati alle proprietà immobiliari.
*   **Collezionismo (Collectibles)**: Tracciamento di beni di valore come orologi, arte o gioielli.
*   **Assicurazioni**: Monitoraggio dei premi, delle scadenze e del valore di riscatto delle polizze.
*   **X-Ray Portfolio**: Analisi approfondita dei costi e della composizione del portafoglio.

---

## Struttura dei File JSON nella Vault

La vault memorizza tutti i dati in file JSON separati. Questa sezione documenta la struttura esatta di ogni file per garantire compatibilità tra app Electron e iOS.

### Note Importanti

1. **Valori Monetari**: Tutti i valori monetari sono salvati come **interi in centesimi** per evitare errori di arrotondamento floating-point.
   - Esempio: €10.99 → `1099` centesimi
   - Esempio: ¥1000 → `1000` (JPY non ha centesimi, salvato così com'è)

2. **Date**: Tutte le date sono in formato **ISO 8601**
   - Formato accettato: `YYYY-MM-DD` oppure `YYYY-MM-DDTHH:mm:ss.sssZ`
   - Esempio: `"2024-01-15"` oppure `"2024-01-15T14:30:00.000Z"`

3. **UUID**: Tutti gli ID sono **UUID v4** nel formato standard
   - Esempio: `"550e8400-e29b-41d4-a716-446655440000"`

4. **Versioning**: Ogni file include un campo `version` per gestire future migrazioni dello schema.

---

### 1. accounts.json

Contiene tutti i conti (checking, savings, investment, etc.).

**Schema:**
```json
{
  "version": 1,
  "accounts": [
    {
      "id": "uuid",
      "brokerId": "uuid",
      "name": "string",
      "type": "checking|savings|credit|investment|cash|loan|deposit|other",
      "currency": "EUR",
      "initialBalance": 0,
      "manualBalance": 0,
      "manualBalanceDate": "2024-01-15T00:00:00.000Z",
      "color": "#6366f1",
      "icon": "wallet",
      "isArchived": false,
      "sortOrder": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

**Campi:**
- `brokerId` (Optional): UUID del broker di appartenenza
- `type`: Tipo di conto
- `currency`: Codice ISO 4217 (3 caratteri)
- `initialBalance`: Saldo iniziale in centesimi
- `manualBalance` (Optional): Override manuale del saldo calcolato
- `isArchived`: Account chiuso/archiviato

---

### 2. brokers.json

Contiene tutte le istituzioni finanziarie.

```json
{
  "version": 1,
  "brokers": [
    {
      "id": "uuid",
      "name": "string",
      "type": "bank|broker|crypto_exchange|insurance|other",
      "color": "#6366f1",
      "icon": "building",
      "website": "https://example.com",
      "logoPath": "logos/<uuid>.png",
      "sortOrder": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

**Campi:**
- `logoPath` (Optional): Percorso relativo nella vault per il logo

---

### 3. categories.json

Categorie per le transazioni.

```json
{
  "version": 1,
  "categories": [
    {
      "id": "uuid",
      "name": "string",
      "type": "income|expense",
      "parentId": "uuid",
      "icon": "tag",
      "color": "#6366f1",
      "sortOrder": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

**Campi:**
- `parentId`: null per categorie top-level, UUID per sottocategorie

---

### 4. transactions/YYYY-MM.json

Transazioni organizzate per mese (es. `transactions/2024-01.json`).

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
      "payee": "string",
      "amount": 1099,
      "currency": "EUR",
      "accountId": "uuid",
      "brokerId": "uuid",
      "categoryId": "uuid",
      "toAccountId": "uuid",
      "splits": [
        {
          "categoryId": "uuid",
          "amount": 500,
          "memo": "string"
        }
      ],
      "status": "pending|cleared",
      "notes": "string",
      "tags": ["tag1"],
      "isReconciled": false,
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

**Validazione:**
- Se `splits` ha elementi, somma `splits[].amount` === `amount`
- Se `type === "transfer"`, `toAccountId` è obbligatorio
- Se non ha splits e non è transfer, `categoryId` è obbligatorio

---

### 5. assets.json

Asset finanziari (azioni, ETF, crypto).

```json
{
  "version": 1,
  "assets": [
    {
      "id": "uuid",
      "symbol": "AAPL",
      "isin": "US0378331005",
      "name": "Apple Inc.",
      "type": "stock|etf|crypto|bond|fund|insurance|other",
      "currency": "USD",
      "currentPrice": 17500,
      "previousClose": 17450,
      "priceHistory": [
        {
          "date": "2024-01-15",
          "price": 17500
        }
      ],
      "lastUpdated": "2024-01-15T14:30:00.000Z",
      "autoRefresh": true,
      "metadata": {
        "sector": "Technology",
        "industry": "Consumer Electronics",
        "region": "North America",
        "country": "USA",
        "exchange": "NASDAQ",
        "description": "string"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

**Campi:**
- `currentPrice`: Prezzo corrente in centesimi
- `previousClose` (Optional): Per calcolare variazione giornaliera
- `autoRefresh`: Abilita aggiornamento automatico da Yahoo Finance

---

### 6. holdings.json

Posizioni su asset (quantità posseduta).

```json
{
  "version": 1,
  "holdings": [
    {
      "id": "uuid",
      "accountId": "uuid",
      "brokerId": "uuid",
      "assetId": "uuid",
      "quantity": 10.5,
      "averageBuyPrice": 15000,
      "taxRate": 26,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

**Campi:**
- `quantity`: Float - numero di unità possedute
- `averageBuyPrice`: Centesimi - prezzo medio d'acquisto per unità
- `taxRate`: Percentuale 0-100 per capital gains

---

### 7. deposits.json

Conti deposito vincolati.

```json
{
  "version": 1,
  "deposits": [
    {
      "id": "uuid",
      "name": "string",
      "brokerId": "uuid",
      "principal": 1000000,
      "grossRate": 4.5,
      "netRate": 3.33,
      "interestPeriodicity": "end|monthly|quarterly|semiannual|annual",
      "activationDate": "2024-01-01",
      "durationMonths": 12,
      "maturityDate": "2025-01-01",
      "constraintType": "free|locked|flexible",
      "currency": "EUR",
      "notes": "string",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### 8. insurance.json

Polizze assicurative.

```json
{
  "version": 1,
  "policies": [
    {
      "id": "uuid",
      "name": "string",
      "provider": "Allianz",
      "policyNumber": "POL-12345",
      "contactInfo": "string",
      "type": "string",
      "premiumAmount": 50000,
      "premiumPeriod": "monthly|quarterly|semiannual|annual|one-time",
      "nextPaymentDate": "2024-02-01",
      "startDate": "2024-01-01",
      "endDate": "2025-01-01",
      "brokerId": "uuid",
      "autoRenewal": false,
      "coverageAmount": 10000000,
      "deductible": 50000,
      "currentValue": 0,
      "currency": "EUR",
      "insuredEntity": "Targa ABC123",
      "notes": "string",
      "accountId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

**Campi:**
- `coverageAmount` (Optional): Massimale in centesimi
- `deductible` (Optional): Franchigia in centesimi
- `insuredEntity` (Optional): Targa auto, indirizzo immobile, etc.

---

### 9. properties.json

Immobili.

```json
{
  "version": 1,
  "properties": [
    {
      "id": "uuid",
      "name": "Appartamento Milano",
      "type": "residence|rental|vacation|land|commercial|other",
      "address": "string",
      "purchaseDate": "2020-01-01",
      "purchasePrice": 25000000,
      "currentValue": 30000000,
      "lastValuationDate": "2024-01-01",
      "currency": "EUR",
      "taxRate": 0,
      "squareMeters": 85.5,
      "notes": "string",
      "imageUrl": "string",
      "mortgageAccountId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

**Campi:**
- `mortgageAccountId` (Optional): Link a conto di tipo "loan"

---

### 10. collectibles.json

Oggetti da collezione.

```json
{
  "version": 1,
  "collectibles": [
    {
      "id": "uuid",
      "name": "Rolex Submariner",
      "type": "watch|art|wine|jewelry|vehicle|trading_card|coin|other",
      "description": "string",
      "purchaseDate": "2020-01-01",
      "purchasePrice": 800000,
      "currentValue": 1200000,
      "taxRate": 0,
      "currency": "EUR",
      "imageUrl": "string",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### 11. snapshots.json

Snapshot del patrimonio netto.

```json
{
  "version": 1,
  "snapshots": [
    {
      "id": "uuid",
      "date": "2024-01-15T00:00:00.000Z",
      "totalNetWorth": 10000000,
      "currency": "EUR",
      "breakdown": {
        "cash": 200000,
        "investments": 5000000,
        "realEstate": 3000000,
        "collectibles": 1200000,
        "insurance": 100000,
        "deposits": 500000
      },
      "unrealizedTax": 130000
    }
  ]
}
```

---

### 12. settings.json

Impostazioni globali dell'applicazione.

```json
{
  "vaultPath": "/path/to/vault",
  "theme": "light|dark|system",
  "lastAppVersion": "1.0.0",
  "lastModified": "2024-01-15T00:00:00.000Z",
  "hasCompletedTutorial": false,
  "windowBounds": {
    "x": 100,
    "y": 100,
    "width": 1200,
    "height": 800,
    "isMaximized": false
  }
}
```

**Campi:**
- `windowBounds` (Optional): Solo per desktop app

---

### 13. workspace.json

Preferenze UI e workspace.

```json
{
  "activeView": "dashboard",
  "dateFilter": "2024-01",
  "layout": {
    "leftSidebarCollapsed": false,
    "leftSidebarWidth": 256,
    "rightSidebarCollapsed": false,
    "rightSidebarWidth": 256
  },
  "autoRefreshOnSnapshot": true,
  "defaultViewMode": "gross|net",
  "holdingsTable": {
    "visibleColumns": ["symbol", "quantity", "value"]
  },
  "uiDensity": "compact|normal|expanded",
  "investmentsDashboard": {
    "dateRange": "all",
    "includeClosed": false
  },
  "accountsDashboard": {
    "dateRange": "current-month",
    "selectedAccountIds": ["uuid1"]
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
  "performanceMetricsPeriod": "YTD|1M|3M|6M|1Y|3Y|ALL"
}
```

**Campi:**
- `taxDefaults`: Percentuali default (0-100) per calcolo tasse
- Tutti i campi sono optional

---

### File Aggiuntivi (Opzionali)

#### trades.json

Storico operazioni buy/sell.

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
      "pricePerUnit": 15000,
      "fees": 500,
      "tax": 0,
      "date": "2024-01-15",
      "realizedGain": 5000,
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

#### dividends.json

Storico dividendi ricevuti.

```json
{
  "version": 1,
  "dividends": [
    {
      "id": "uuid",
      "assetId": "uuid",
      "accountId": "uuid",
      "date": "2024-01-15",
      "amountPerShare": 100,
      "totalAmount": 1000,
      "currency": "EUR",
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

---

## Note per Implementazione iOS

1. **Parsing JSON**: Usare `Codable` con `JSONDecoder`:
   - Configurare `keyDecodingStrategy = .useDefaultKeys` (camelCase)
   - Gestire campi Optional correttamente
   - Validare che valori monetari siano interi

2. **Date**: Configurare `dateDecodingStrategy` per ISO8601

3. **UUID**: Usare type nativo Swift `UUID`

4. **Validazione**: Implementare validazione analoga a Zod:
   - Currency: 3 caratteri uppercase
   - Color: regex `#[0-9A-Fa-f]{6}`
   - Amounts: interi non negativi

5. **Versioning**: Rispettare sempre campo `version` per migrazioni future
