#!/bin/bash

# Test script for API routes
# Usage: ./test-api-routes.sh [base_url]

BASE_URL=${1:-"http://localhost:3090"}

echo "🧪 Testing API Routes with Improved Workflow System"
echo "Base URL: $BASE_URL"
echo

# Test workflow statistics
echo "📊 Testing workflow statistics..."
curl -s "$BASE_URL/api/workflows/stats" | jq '.' || echo "❌ Failed to get stats"
echo

# Test active executions
echo "📋 Testing active executions..."
curl -s "$BASE_URL/api/workflows/active" | jq '.' || echo "❌ Failed to get active executions"
echo

# Test workflow types
echo "🔄 Testing workflow types..."
curl -s "$BASE_URL/api/workflows/types" | jq '.' || echo "❌ Failed to get workflow types"
echo

# Test health check (if available)
echo "💚 Testing health check..."
curl -s "$BASE_URL/api/health" | jq '.' || echo "⚠️ Health endpoint not available"
echo

# Test specific account status (using test account)
echo "👤 Testing account status..."
curl -s "$BASE_URL/api/workflows/status/test-account" | jq '.' || echo "⚠️ No workflow for test-account"
echo

echo "✅ API route testing complete!"
echo
echo "💡 If tests fail, check:"
echo "   1. Server is running"
echo "   2. workflowExecutorV2.initialize() was called"
echo "   3. Database connection is working"
echo "   4. All services are properly initialized"
