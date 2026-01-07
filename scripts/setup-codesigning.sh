#!/bin/bash

# Script per verificare e configurare il code signing per macOS
# Uso: ./scripts/setup-codesigning.sh

set -e

echo "🔍 Verifica Code Signing per My Wealth"
echo "========================================"
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verifica certificati installati
echo "1️⃣  Verifica certificati Developer ID..."
CERTS=$(security find-identity -v -p codesigning | grep "Developer ID Application" || echo "")

if [ -z "$CERTS" ]; then
    echo -e "${RED}❌ Nessun certificato 'Developer ID Application' trovato${NC}"
    echo ""
    echo "📝 Passi da seguire:"
    echo "   1. Vai su https://developer.apple.com"
    echo "   2. Certificates, Identifiers & Profiles"
    echo "   3. Crea un certificato 'Developer ID Application'"
    echo "   4. Scarica e installa il certificato .cer"
    echo ""
    echo "Per maggiori dettagli, consulta: apple-code-signing-guide.md"
    exit 1
else
    echo -e "${GREEN}✅ Certificato trovato:${NC}"
    echo "$CERTS"
fi

echo ""

# 2. Verifica variabili d'ambiente
echo "2️⃣  Verifica variabili d'ambiente..."

if [ -z "$APPLE_ID" ]; then
    echo -e "${YELLOW}⚠️  APPLE_ID non impostato${NC}"
    echo "   Imposta con: export APPLE_ID=\"tua-email@example.com\""
else
    echo -e "${GREEN}✅ APPLE_ID: $APPLE_ID${NC}"
fi

if [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  APPLE_APP_SPECIFIC_PASSWORD non impostato${NC}"
    echo "   Genera su: https://appleid.apple.com"
    echo "   Imposta con: export APPLE_APP_SPECIFIC_PASSWORD=\"xxxx-xxxx-xxxx-xxxx\""
else
    echo -e "${GREEN}✅ APPLE_APP_SPECIFIC_PASSWORD: ****${NC}"
fi

if [ -z "$APPLE_TEAM_ID" ]; then
    echo -e "${YELLOW}⚠️  APPLE_TEAM_ID non impostato${NC}"
    echo "   Trova su: https://developer.apple.com/account"
    echo "   Imposta con: export APPLE_TEAM_ID=\"ABC123XYZ\""
else
    echo -e "${GREEN}✅ APPLE_TEAM_ID: $APPLE_TEAM_ID${NC}"
fi

echo ""

# 3. Verifica file entitlements
echo "3️⃣  Verifica file entitlements..."
if [ -f "build/entitlements.mac.plist" ]; then
    echo -e "${GREEN}✅ build/entitlements.mac.plist trovato${NC}"
else
    echo -e "${RED}❌ build/entitlements.mac.plist non trovato${NC}"
    exit 1
fi

echo ""

# 4. Riepilogo
echo "📊 Riepilogo"
echo "============"

READY=true

if [ -z "$CERTS" ]; then
    echo -e "${RED}❌ Certificato: Non installato${NC}"
    READY=false
else
    echo -e "${GREEN}✅ Certificato: Installato${NC}"
fi

if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
    echo -e "${YELLOW}⚠️  Variabili d'ambiente: Incomplete${NC}"
    echo "   (Opzionale per code signing, richiesto per notarizzazione)"
else
    echo -e "${GREEN}✅ Variabili d'ambiente: Complete${NC}"
fi

echo ""

if [ "$READY" = true ]; then
    echo -e "${GREEN}🎉 Pronto per il code signing!${NC}"
    echo ""
    echo "Esegui il build con:"
    echo "  npm run build:mac"
    echo ""
    if [ -z "$APPLE_ID" ]; then
        echo "Per abilitare la notarizzazione, imposta le variabili d'ambiente."
    fi
else
    echo -e "${RED}❌ Non pronto per il code signing${NC}"
    echo ""
    echo "Consulta la guida completa in: apple-code-signing-guide.md"
fi
