# Guida alla Creazione di Broker per Agent

Questo documento descrive come gestire e creare nuovi broker (istituzioni finanziarie) nell'ecosistema MyWealth. Segui queste istruzioni per assicurarti che i broker siano configurati correttamente e con le immagini appropriate.

## 1. Tipi di Broker esistenti

Un broker è definito nel file `brokers.json` all'interno del vault dell'utente. I campi principali sono:

- `id`: UUID v4 univoco.
- `name`: Nome del broker (es. "Fineco", "Binance").
- `type`: Uno tra `bank`, `broker`, `crypto_exchange`, `insurance`, `other`.
- `color`: Colore esadecimale (es. `#6366f1`).
- `icon`: Nome dell'icona Lucide o riferimento all'immagine nel registro.
- `logoPath`: Path relativo al logo all'interno della cartella `logos/` del vault.

## 2. Broker Predefiniti (Registry)

L'applicazione mantiene un registro di broker predefiniti con loghi già pronti.

- **File del Registro**: `resources/logo-registry.json`
- **Cartella Immagini**: `resources/asset-icons/`

### Come usare un broker predefinito:
Se il broker che stai creando esiste nel `logo-registry.json`:
1. Copia i dati dal registro (`name`, `type`, `website`, `icon`).
2. Usa il nome del file immagine definito nel campo `icon` del registro.
3. In fase di creazione nel vault, il campo `logoPath` rimarrà vuoto se l'app carica l'immagine tramite il protocollo `asset://` basandosi sul nome dell'icona nel registro.

## 3. Creazione di un Nuovo Broker (Custom)

Se devi creare un broker non presente nel registro:

### Recupero delle immagini
Le immagini dei broker possono essere ottenute in tre modi:
1. **Download automatico**: Usa il dominio del sito web per scaricare la favicon o il logo (l'app usa internamente servizi come Clearbit o Google Favicons).
2. **Selezione manuale**: L'utente può fornire un file immagine (`png`, `jpg`, `jpeg`, `svg`, `webp`).
3. **Download via API**: Se conosci il sito web, scarica il logo e salvalo nel vault.

### Salvataggio nel Vault
Quando crei un broker custom con un'immagine specifica:
1. Salva l'immagine nella cartella `{vault}/logos/`.
2. Nomina il file con l'ID del broker (es. `{brokerId}.png`).
3. Imposta il campo `logoPath` nel file `brokers.json` come `logos/{brokerId}.png`.

## 4. Esempio di Struttura in `brokers.json`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Fineco Bank",
  "type": "broker",
  "color": "#0047bb",
  "icon": "Fineco.jpeg",
  "website": "https://finecobank.com",
  "logoPath": null, // null perché è un preset presente in resources/asset-icons
  "sortOrder": 0,
  "createdAt": "2024-01-30T10:00:00.000Z",
  "updatedAt": "2024-01-30T10:00:00.000Z"
}
```

## 5. Regole per l'Agent

- **Priorità ai Preset**: Prima di creare un broker custom, controlla sempre se è presente in `resources/logo-registry.json`.
- **Naming**: Assicurati che i nomi dei broker siano leggibili e consistenti.
- **Colori**: Se crei un broker custom, cerca di usare il colore primario del brand.
- **Protocollo Asset**: Ricorda che nel renderer le immagini dei preset vengono caricate tramite `asset://${encodeURIComponent(preset.icon)}`.

---

**Percorsi Chiave**:
- `/resources/logo-registry.json`: Elenco broker predefiniti.
- `/resources/asset-icons/`: Icone dei broker predefiniti.
- `{vault}/brokers.json`: Luogo di persistenza dei broker dell'utente.
- `{vault}/logos/`: Cartella per i loghi caricati/scaricati autonomamente.
