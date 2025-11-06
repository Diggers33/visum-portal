#!/bin/bash

# Navigation Configuration Verification Script
# Run this from your project root directory

echo "🔍 Verifying Navigation Configuration..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

echo "✓ Found package.json - in project root"
echo ""

# Test 1: Check if App.tsx has ProductsManagement import
echo "Test 1: Checking App.tsx for ProductsManagement import..."
if grep -q "import ProductsManagement from './components/admin/ProductsManagement'" src/App.tsx; then
    echo -e "${GREEN}✓ ProductsManagement import found${NC}"
else
    echo -e "${RED}✗ ProductsManagement import NOT found${NC}"
    echo "  App.tsx needs to be replaced!"
fi
echo ""

# Test 2: Check if App.tsx has Products route
echo "Test 2: Checking App.tsx for /admin/products route..."
if grep -q "path=\"/admin/products\"" src/App.tsx; then
    echo -e "${GREEN}✓ /admin/products route found${NC}"
else
    echo -e "${RED}✗ /admin/products route NOT found${NC}"
    echo "  App.tsx needs to be replaced!"
fi
echo ""

# Test 3: Check if App.tsx has ProductDetail import
echo "Test 3: Checking App.tsx for ProductDetail import..."
if grep -q "import ProductDetail from './components/ProductDetail'" src/App.tsx; then
    echo -e "${GREEN}✓ ProductDetail import found${NC}"
else
    echo -e "${RED}✗ ProductDetail import NOT found${NC}"
    echo "  App.tsx needs to be replaced!"
fi
echo ""

# Test 4: Check if DashboardLayout has correct Products link
echo "Test 4: Checking DashboardLayout for /portal/products link..."
if grep -q "href: '/portal/products'" src/components/DashboardLayout.tsx; then
    echo -e "${GREEN}✓ Correct distributor Products link found${NC}"
else
    echo -e "${RED}✗ Distributor Products link incorrect${NC}"
    echo "  DashboardLayout.tsx needs to be replaced!"
fi
echo ""

# Test 5: Check if ProductCatalog has correct View Details link
echo "Test 5: Checking ProductCatalog for correct View Details link..."
if grep -q "/portal/products/\${product.id}" src/components/ProductCatalog.tsx; then
    echo -e "${GREEN}✓ Correct View Details link found${NC}"
else
    echo -e "${RED}✗ View Details link incorrect${NC}"
    echo "  ProductCatalog.tsx needs to be replaced!"
fi
echo ""

# Test 6: Check if ProductDetail exists
echo "Test 6: Checking if ProductDetail component exists..."
if [ -f "src/components/ProductDetail.tsx" ]; then
    echo -e "${GREEN}✓ ProductDetail.tsx found${NC}"
else
    echo -e "${RED}✗ ProductDetail.tsx NOT found${NC}"
    echo "  Need to add ProductDetail.tsx component!"
fi
echo ""

# Test 7: Check if ProductsManagement exists
echo "Test 7: Checking if ProductsManagement component exists..."
if [ -f "src/components/admin/ProductsManagement.tsx" ]; then
    echo -e "${GREEN}✓ ProductsManagement.tsx found${NC}"
else
    echo -e "${RED}✗ ProductsManagement.tsx NOT found${NC}"
    echo "  Need to add ProductsManagement.tsx component!"
fi
echo ""

# Test 8: Check if EditProduct exists
echo "Test 8: Checking if EditProduct component exists..."
if [ -f "src/components/admin/EditProduct.tsx" ]; then
    echo -e "${GREEN}✓ EditProduct.tsx found${NC}"
else
    echo -e "${YELLOW}⚠ EditProduct.tsx NOT found (optional)${NC}"
fi
echo ""

# Summary
echo "========================================="
echo "📊 SUMMARY"
echo "========================================="
echo ""

ERRORS=0

# Count issues
if ! grep -q "import ProductsManagement" src/App.tsx; then ((ERRORS++)); fi
if ! grep -q "path=\"/admin/products\"" src/App.tsx; then ((ERRORS++)); fi
if ! grep -q "import ProductDetail" src/App.tsx; then ((ERRORS++)); fi
if ! grep -q "href: '/portal/products'" src/components/DashboardLayout.tsx; then ((ERRORS++)); fi
if ! grep -q "/portal/products/\${product.id}" src/components/ProductCatalog.tsx; then ((ERRORS++)); fi
if [ ! -f "src/components/ProductDetail.tsx" ]; then ((ERRORS++)); fi
if [ ! -f "src/components/admin/ProductsManagement.tsx" ]; then ((ERRORS++)); fi

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Configuration is correct.${NC}"
    echo ""
    echo "If navigation still doesn't work:"
    echo "1. Restart dev server (Ctrl+C, then npm start)"
    echo "2. Clear browser cache (Ctrl+Shift+R)"
    echo "3. Check browser console for errors (F12)"
else
    echo -e "${RED}✗ Found $ERRORS issue(s) that need fixing${NC}"
    echo ""
    echo "📋 Action items:"
    echo "1. Replace the files that failed checks"
    echo "2. Run this script again to verify"
    echo "3. Restart dev server"
fi

echo ""
echo "========================================="
