#!/bin/bash

# Quick test of main endpoints to verify API functionality
# Tests the most important endpoints from each route category

BASE_URL=${1:-"http://localhost:3090"}

echo "🧪 TESTING MAIN API ENDPOINTS"
echo "Base URL: $BASE_URL"
echo "==============================="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    echo -ne "Testing ${method} ${endpoint}... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
    else
        if [ -n "$data" ]; then
            response=$(curl -s -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint" 2>/dev/null)
        else
            response=$(curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" 2>/dev/null)
        fi
    fi
    
    # Extract status code (last 3 characters)
    status_code="${response: -3}"
    
    if [[ $status_code =~ ^[23][0-9][0-9]$ ]]; then
        echo -e "${GREEN}✓ $status_code${NC} - $description"
    elif [[ $status_code == "404" ]]; then
        echo -e "${YELLOW}⚠ $status_code${NC} - $description (Route not found)"
    else
        echo -e "${RED}✗ $status_code${NC} - $description"
    fi
}

echo "=== WORKFLOW ROUTES (Core Functionality) ==="
test_endpoint "GET" "/api/workflows/stats" "Workflow Statistics"
test_endpoint "GET" "/api/workflows/active" "Active Workflows"
test_endpoint "GET" "/api/workflows/definitions" "Workflow Definitions"
test_endpoint "GET" "/api/workflows/health" "Workflow Health"
test_endpoint "GET" "/api/workflows/monitoring/dashboard" "Monitoring Dashboard"

echo
echo "=== ACCOUNT ROUTES ==="
test_endpoint "GET" "/api/accounts/health" "Account Health"
test_endpoint "GET" "/api/accounts/models" "Available Models"
test_endpoint "GET" "/api/accounts/workflows/active" "Account Active Workflows"
test_endpoint "GET" "/api/accounts/workflows/stats" "Account Workflow Stats"

echo
echo "=== AI ROUTES ==="
test_endpoint "GET" "/api/ai/health" "AI Service Health"
test_endpoint "GET" "/api/ai/usernames/stats" "Username Stats"
test_endpoint "POST" "/api/ai/generate-prompt" "Generate Prompt" '{"model":"Lola","channel":"gram","preferences":{"style":"casual"}}'

echo
echo "=== ACTIONS ROUTES ==="  
test_endpoint "GET" "/api/actions/health" "Actions Health"
test_endpoint "GET" "/api/actions/swipe/active" "Active Swipe Tasks"

echo
echo "=== SPECIFIC WORKFLOW TESTING ==="
# Test with actual account IDs from your active workflows
test_endpoint "GET" "/api/workflows/status/quick-test-1753977764787" "Specific Workflow Status"
test_endpoint "GET" "/api/accounts/workflow/quick-test-1753977764787" "Account Workflow Status"

echo
echo "========================================="
echo "🎯 MAIN ENDPOINTS TEST COMPLETE"
echo "========================================="
echo
echo "💡 Quick Status Check:"
echo "- Green ✓: Endpoint working correctly"
echo "- Yellow ⚠: Route not found (404) - may not be implemented"
echo "- Red ✗: Server error or other issue"
echo
echo "🚀 Run the full test with: ./test-all-endpoints.sh"