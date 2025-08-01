#!/bin/bash

# Comprehensive API endpoint testing script
# Tests all endpoints from accountRoutes, aiRoutes, actionsRoutes, and workflowRoutes

BASE_URL=${1:-"http://localhost:3090"}
OUTPUT_FILE="api-test-results-$(date +%Y%m%d_%H%M%S).json"

echo "🧪 COMPREHENSIVE API ENDPOINT TESTING"
echo "Base URL: $BASE_URL"
echo "Results will be saved to: $OUTPUT_FILE"
echo "========================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local expected_status=${5:-200}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -ne "Testing ${method} ${endpoint}... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint")
        fi
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint")
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    # Extract response body (all but last line)  
    response_body=$(echo "$response" | head -n -1)
    
    # Check if successful (2xx or 3xx status codes, or specific expected codes)
    if [[ $status_code =~ ^[23][0-9][0-9]$ ]] || [[ $status_code == "404" && $expected_status == "404" ]]; then
        echo -e "${GREEN}✓ $status_code${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "  → $description"
    else
        echo -e "${RED}✗ $status_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "  → $description"
        echo "  → Response: $(echo "$response_body" | head -c 100)..."
    fi
    
    echo
}

# Test data samples
SAMPLE_ACCOUNT='{"accountId":"test-account-001","cardId":"card123","model":"Lola","channel":"tinder"}'
SAMPLE_ACCOUNTS='[{"accountId":"test1","cardId":"card1","model":"Lola"},{"accountId":"test2","cardId":"card2","model":"Aura"}]'
SAMPLE_AI_PROMPT='{"model":"Lola","preferences":{"style":"casual","length":"short"}}'
SAMPLE_BIO='{"model":"Lola","preferences":{"style":"funny","age":"25"}}'
SAMPLE_SWIPE='{"accountId":"test-account-001","count":10}'
SAMPLE_SPECTRE='{"accountId":"test-account-001","config":{"mode":"smart","speed":"normal"}}'
SAMPLE_BIO_UPDATE='{"accountId":"test-account-001","bio":"Updated bio text"}'
SAMPLE_PROMPT_UPDATE='{"accountId":"test-account-001","prompt":"Updated prompt text"}'
SAMPLE_WORKFLOW_START='{"accountId":"test-workflow-001","workflowType":"test","accountData":{"cardId":"card123","model":"Lola"}}'
SAMPLE_WORKFLOW_DEF='{"name":"Test Workflow","type":"test_new","description":"Test workflow","steps":[{"id":"step1","action":"wait","delay":1000}],"config":{}}'

echo "=== ACCOUNT ROUTES TESTING ==="

# Account Import Routes
test_endpoint "POST" "/api/accounts/import" "Import single account" "$SAMPLE_ACCOUNT"
test_endpoint "POST" "/api/accounts/import-multiple" "Import multiple accounts" "$SAMPLE_ACCOUNTS"

# Account Workflow Routes  
test_endpoint "GET" "/api/accounts/workflow/test-account-001" "Get workflow status for account"
test_endpoint "POST" "/api/accounts/workflow/test-account-001/stop" "Stop workflow for account"
test_endpoint "GET" "/api/accounts/workflows/active" "Get all active workflows"
test_endpoint "GET" "/api/accounts/workflows/stats" "Get workflow statistics"
test_endpoint "POST" "/api/accounts/workflows/pause-all" "Pause all workflows"
test_endpoint "POST" "/api/accounts/workflows/resume-all" "Resume all workflows"
test_endpoint "POST" "/api/accounts/workflow/test-account-001/pause" "Pause specific workflow"
test_endpoint "POST" "/api/accounts/workflow/test-account-001/resume" "Resume specific workflow"
test_endpoint "GET" "/api/accounts/workflow/test-account-001/details" "Get detailed workflow status"

# Account Utility Routes
test_endpoint "GET" "/api/accounts/models" "Get available models"
test_endpoint "GET" "/api/accounts/health" "Account service health check"

echo
echo "=== AI ROUTES TESTING ==="

# AI Health
test_endpoint "GET" "/api/ai/health" "AI service health check"

# AI Prompt Generation
test_endpoint "POST" "/api/ai/generate-prompt" "Generate single AI prompt" "$SAMPLE_AI_PROMPT"
test_endpoint "POST" "/api/ai/generate-prompts" "Generate multiple AI prompts" "$SAMPLE_AI_PROMPT"
test_endpoint "POST" "/api/ai/generate-upload-prompt" "Generate and upload prompt" "$SAMPLE_AI_PROMPT"

# AI Bio Generation  
test_endpoint "POST" "/api/ai/generate-bios" "Generate AI bios" "$SAMPLE_BIO"

# Username Management
test_endpoint "POST" "/api/ai/usernames" "Upload usernames" '{"usernames":["test1","test2"]}'
test_endpoint "GET" "/api/ai/usernames/Lola/tinder" "Get usernames for model/channel"
test_endpoint "GET" "/api/ai/usernames/stats" "Get username statistics"

echo
echo "=== ACTIONS ROUTES TESTING ==="

# Swipe Operations
test_endpoint "POST" "/api/actions/swipe" "Start swipe task" "$SAMPLE_SWIPE"
test_endpoint "GET" "/api/actions/swipe/status/test-task-id" "Check swipe status"
test_endpoint "POST" "/api/actions/swipe/stop/test-task-id" "Stop swipe task"
test_endpoint "GET" "/api/actions/swipe/poll/test-task-id" "Poll swipe status"
test_endpoint "GET" "/api/actions/swipe/active" "Get active swipe tasks"
test_endpoint "POST" "/api/actions/swipe/stop-all" "Stop all swipe tasks"

# Spectre Operations
test_endpoint "POST" "/api/actions/spectre/enable" "Configure Spectre mode" "$SAMPLE_SPECTRE"
test_endpoint "POST" "/api/actions/spectre/flow" "Complete Spectre flow" "$SAMPLE_SPECTRE"
test_endpoint "POST" "/api/actions/spectre/bulk-enable" "Bulk configure Spectre" "[$SAMPLE_SPECTRE]"
test_endpoint "GET" "/api/actions/spectre/status/test-task-id" "Check Spectre status"

# Bio Operations
test_endpoint "POST" "/api/actions/bio/update" "Update bio" "$SAMPLE_BIO_UPDATE"
test_endpoint "POST" "/api/actions/bio/generate-update" "Generate and update bio" "$SAMPLE_BIO_UPDATE"
test_endpoint "POST" "/api/actions/bio/bulk-update" "Bulk bio update" "[$SAMPLE_BIO_UPDATE]"
test_endpoint "GET" "/api/actions/bio/status/test-task-id" "Check bio update status"

# Prompt Operations
test_endpoint "POST" "/api/actions/prompt/update" "Update prompt" "$SAMPLE_PROMPT_UPDATE"
test_endpoint "POST" "/api/actions/prompt/generate-update" "Generate and update prompt" "$SAMPLE_PROMPT_UPDATE"
test_endpoint "POST" "/api/actions/prompt/bulk-update" "Bulk prompt update" "[$SAMPLE_PROMPT_UPDATE]"
test_endpoint "GET" "/api/actions/prompt/status/test-task-id" "Check prompt update status"

# Combo Operations
test_endpoint "POST" "/api/actions/bio-prompt/combo-update" "Update bio and prompt" '{"accountId":"test-account-001","bio":"New bio","prompt":"New prompt"}'

# Actions Health
test_endpoint "GET" "/api/actions/health" "Actions service health check"

echo
echo "=== WORKFLOW ROUTES TESTING ==="

# Workflow Execution
test_endpoint "POST" "/api/workflows/start" "Start workflow execution" "$SAMPLE_WORKFLOW_START"
test_endpoint "GET" "/api/workflows/status/test-workflow-001" "Get workflow status"
test_endpoint "POST" "/api/workflows/stop/test-workflow-001" "Stop workflow"
test_endpoint "GET" "/api/workflows/active" "Get active workflows"
test_endpoint "GET" "/api/workflows/stats" "Get workflow statistics"

# Workflow Definitions
test_endpoint "GET" "/api/workflows/definitions" "Get workflow definitions"
test_endpoint "GET" "/api/workflows/definitions/test" "Get specific workflow definition"
test_endpoint "POST" "/api/workflows/definitions" "Create workflow definition" "$SAMPLE_WORKFLOW_DEF"
test_endpoint "PUT" "/api/workflows/definitions/test_new" "Update workflow definition" "$SAMPLE_WORKFLOW_DEF"
test_endpoint "DELETE" "/api/workflows/definitions/test_new" "Delete workflow definition" "" "404"
test_endpoint "GET" "/api/workflows/examples" "Get workflow examples"

# Monitoring
test_endpoint "GET" "/api/workflows/monitoring/dashboard" "Get monitoring dashboard"
test_endpoint "GET" "/api/workflows/monitoring/alerts" "Get system alerts"

# System Control
test_endpoint "POST" "/api/workflows/control/pause-all" "Pause all workflows"
test_endpoint "POST" "/api/workflows/control/resume-all" "Resume all workflows"

# Health & Testing
test_endpoint "GET" "/api/workflows/health" "Workflow system health"
test_endpoint "POST" "/api/workflows/test" "Test workflow" "$SAMPLE_WORKFLOW_START"
test_endpoint "GET" "/api/workflows/test/quick" "Quick test workflow"

echo
echo "========================================"
echo "🎯 TEST SUMMARY"
echo "========================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
else
    success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}Success Rate: $success_rate%${NC}"
    
    if [ $success_rate -ge 80 ]; then
        echo -e "${GREEN}✅ Good success rate!${NC}"
    elif [ $success_rate -ge 60 ]; then
        echo -e "${YELLOW}⚠️ Moderate success rate${NC}"
    else
        echo -e "${RED}❌ Low success rate - needs attention${NC}"
    fi
fi

echo
echo "💡 Notes:"
echo "- Some endpoints may return 404 if routes are not mounted"
echo "- Some endpoints may require specific data or authentication"
echo "- Controllers may fallback to mock implementations"
echo "- Check server logs for detailed error information"