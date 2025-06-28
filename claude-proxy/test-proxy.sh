#!/bin/bash

echo "🧪 Testing Claude Proxy Bridge..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
check_server() {
    echo "📡 Checking if proxy server is running..."
    if curl -sf http://localhost:3000/health > /dev/null; then
        echo -e "${GREEN}✅ Server is running${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Server not running. Starting it...${NC}"
        return 1
    fi
}

# Start server if needed
start_server() {
    cd "$(dirname "$0")"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo "📝 Creating .env from template..."
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Using default configuration (no API key)${NC}"
    fi
    
    # Install dependencies if needed
    if [ ! -d node_modules ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Start server in background
    echo "🚀 Starting proxy server..."
    nohup npm start > test-server.log 2>&1 &
    SERVER_PID=$!
    echo "Server PID: $SERVER_PID"
    
    # Wait for server to start
    for i in {1..30}; do
        if curl -sf http://localhost:3000/health > /dev/null; then
            echo -e "${GREEN}✅ Server started successfully${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ Server failed to start${NC}"
    cat test-server.log
    return 1
}

# Test health endpoint
test_health() {
    echo ""
    echo "🏥 Testing health endpoint..."
    response=$(curl -s http://localhost:3000/health)
    if echo "$response" | jq -e '.status == "healthy"' > /dev/null; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        echo "$response" | jq .
    else
        echo -e "${RED}❌ Health check failed${NC}"
        echo "$response"
    fi
}

# Test status endpoint
test_status() {
    echo ""
    echo "📊 Testing status endpoint..."
    response=$(curl -s http://localhost:3000/api/status)
    if echo "$response" | jq -e '.status' > /dev/null; then
        echo -e "${GREEN}✅ Status check passed${NC}"
        echo "$response" | jq .
    else
        echo -e "${RED}❌ Status check failed${NC}"
        echo "$response"
    fi
}

# Test GitHub Actions endpoint
test_github_actions() {
    echo ""
    echo "🔄 Testing GitHub Actions endpoint..."
    
    # Create test request
    cat > test-request.json << EOF
{
    "action": "chat",
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "direct_prompt": "Say 'Hello from Claude Proxy!' and nothing else",
    "context": {
        "repository": "test/repo",
        "workflow": "test-workflow"
    }
}
EOF
    
    echo "📤 Sending test request..."
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "X-GitHub-Repository: test/repo" \
        -d @test-request.json \
        http://localhost:3000/api/github-actions/claude)
    
    if echo "$response" | jq -e '.response' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ GitHub Actions endpoint working${NC}"
        echo "$response" | jq .
    elif echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        error=$(echo "$response" | jq -r '.error')
        if [[ "$error" == *"No authentication"* ]] || [[ "$error" == *"API key"* ]]; then
            echo -e "${YELLOW}⚠️  Expected error - no API key configured${NC}"
            echo "$response" | jq .
        else
            echo -e "${RED}❌ Unexpected error${NC}"
            echo "$response" | jq .
        fi
    else
        echo -e "${RED}❌ Invalid response${NC}"
        echo "$response"
    fi
    
    rm -f test-request.json
}

# Test metrics endpoint
test_metrics() {
    echo ""
    echo "📈 Testing metrics endpoint..."
    response=$(curl -s http://localhost:3000/api/metrics)
    if echo "$response" | jq -e '.requests' > /dev/null; then
        echo -e "${GREEN}✅ Metrics endpoint working${NC}"
        echo "$response" | jq .
    else
        echo -e "${RED}❌ Metrics endpoint failed${NC}"
        echo "$response"
    fi
}

# Check Claude Code CLI
check_claude_cli() {
    echo ""
    echo "🔍 Checking Claude Code CLI..."
    if command -v claude &> /dev/null; then
        echo -e "${GREEN}✅ Claude Code CLI found${NC}"
        claude --version 2>/dev/null || echo "Version info not available"
        return 0
    else
        echo -e "${YELLOW}⚠️  Claude Code CLI not found${NC}"
        echo "To install: curl -fsSL https://api.claude.ai/install.sh | sh"
        return 1
    fi
}

# Main test sequence
main() {
    echo "🔗 Claude Proxy Bridge Test Suite"
    echo "================================="
    
    # Check if server is running, start if needed
    if ! check_server; then
        if ! start_server; then
            exit 1
        fi
    fi
    
    # Run tests
    test_health
    test_status
    test_github_actions
    test_metrics
    check_claude_cli
    
    echo ""
    echo "🏁 Test Summary:"
    echo "================"
    
    # Check configuration
    if [ -f .env ]; then
        if grep -q "^ANTHROPIC_API_KEY=" .env && ! grep -q "^# ANTHROPIC_API_KEY=" .env; then
            echo -e "${GREEN}✅ API key configured${NC}"
        else
            echo -e "${YELLOW}⚠️  No API key configured (MAX subscription mode)${NC}"
        fi
    fi
    
    echo ""
    echo "📚 Next steps:"
    echo "1. Configure .env with API key or install Claude Code CLI"
    echo "2. Use GitHub Actions workflows with proxy endpoints"
    echo "3. Monitor logs in claude-proxy/logs/"
    
    # Cleanup
    if [ -f test-server.log ] && [ -s test-server.log ]; then
        echo ""
        echo "📋 Server logs preview:"
        tail -20 test-server.log
    fi
}

# Run tests
main