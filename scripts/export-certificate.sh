#!/bin/bash

# Script per esportare il certificato Developer ID per GitHub Actions
# Questo script ti guiderà nell'esportazione del certificato in formato base64

set -e

echo "📦 Esportazione certificato per GitHub Actions"
echo "=============================================="
echo ""

# Trova il certificato
CERT_NAME=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed 's/.*"\(.*\)"/\1/')

if [ -z "$CERT_NAME" ]; then
    echo "❌ Nessun certificato Developer ID Application trovato"
    exit 1
fi

echo "✅ Certificato trovato: $CERT_NAME"
echo ""

# Chiedi la password per il file .p12
echo "🔐 Inserisci una password per proteggere il file .p12"
echo "    (Questa password andrà salvata come secret MACOS_CERTIFICATE_PASSWORD su GitHub)"
read -s -p "Password: " P12_PASSWORD
echo ""
echo ""

# Esporta il certificato
TEMP_P12="/tmp/certificate.p12"
security export -k login.keychain -t identities -f pkcs12 -o "$TEMP_P12" -P "$P12_PASSWORD"

# Converti in base64
CERT_BASE64=$(base64 -i "$TEMP_P12")

echo "✅ Certificato esportato con successo!"
echo ""
echo "📋 Secrets da aggiungere su GitHub:"
echo "===================================="
echo ""
echo "1. MACOS_CERTIFICATE"
echo "   Valore:"
echo "$CERT_BASE64"
echo ""
echo "2. MACOS_CERTIFICATE_PASSWORD"
echo "   Valore: [la password che hai appena inserito]"
echo ""
echo "3. KEYCHAIN_PASSWORD"
echo "   Valore: [una password casuale, es: $(openssl rand -base64 32)]"
echo ""
echo "4. APPLE_ID"
echo "   Valore: [il tuo Apple ID email]"
echo ""
echo "5. APPLE_APP_SPECIFIC_PASSWORD"
echo "   Valore: [la password specifica per app che hai generato]"
echo ""
echo "6. APPLE_TEAM_ID"
echo "   Valore: UDZC3RG9P6"
echo ""

# Cleanup
rm "$TEMP_P12"

echo "🎉 Fatto! Copia i valori sopra nei GitHub Secrets"
