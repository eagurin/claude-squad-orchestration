#!/bin/bash
# cs-claude-orchestrator.sh - Оркестрация 4 Claude агентов через CS для параллельной разработки

set -e

# Конфигурация
PROJECT_NAME="${1:-my-project}"
PROJECT_DIR="${2:-$(pwd)}"
RESULTS_DIR="$PROJECT_DIR/claude-results"
LOGS_DIR="$PROJECT_DIR/claude-logs"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Создаем необходимые директории
mkdir -p "$RESULTS_DIR" "$LOGS_DIR"

echo -e "${BLUE}🎭 Claude Squad Orchestrator${NC}"
echo -e "Project: $PROJECT_NAME"
echo -e "Directory: $PROJECT_DIR"
echo ""

# Функция для запуска агента
launch_claude_agent() {
    local agent_name="$1"
    local agent_role="$2"
    local agent_prompt="$3"
    local dependencies="$4"
    
    echo -e "${YELLOW}🚀 Launching agent: $agent_name ($agent_role)${NC}"
    
    # Создаем скрипт для выполнения в tmux сессии
    cat > "$LOGS_DIR/${agent_name}.sh" << EOF
#!/bin/bash
cd "$PROJECT_DIR"

# Ждем выполнения зависимостей
if [ -n "$dependencies" ]; then
    echo "Waiting for dependencies: $dependencies"
    for dep in $dependencies; do
        while [ ! -f "$RESULTS_DIR/\${dep}.completed" ]; do
            sleep 2
        done
    done
fi

# Выполняем Claude Code в неинтерактивном режиме
echo "Starting Claude Code task..."
claude -p "$agent_prompt" \\
    --output-format json \\
    --max-turns 10 \\
    --dangerously-skip-permissions \\
    > "$RESULTS_DIR/${agent_name}.json" 2> "$LOGS_DIR/${agent_name}.error"

# Проверяем результат
if [ \$? -eq 0 ]; then
    echo "Task completed successfully"
    touch "$RESULTS_DIR/${agent_name}.completed"
    
    # Извлекаем результат
    jq -r '.result // .content // .output' "$RESULTS_DIR/${agent_name}.json" > "$RESULTS_DIR/${agent_name}.output"
else
    echo "Task failed"
    touch "$RESULTS_DIR/${agent_name}.failed"
fi
EOF
    
    chmod +x "$LOGS_DIR/${agent_name}.sh"
    
    # Запускаем в tmux сессии
    tmux new-session -d -s "cs-${agent_name}" "$LOGS_DIR/${agent_name}.sh"
}

# Функция для мониторинга прогресса
monitor_progress() {
    echo -e "\n${BLUE}📊 Monitoring progress...${NC}"
    
    local all_completed=false
    while [ "$all_completed" = false ]; do
        clear
        echo -e "${BLUE}🎭 Claude Squad Orchestrator - Progress${NC}"
        echo -e "Time: $(date '+%H:%M:%S')"
        echo ""
        
        all_completed=true
        
        for agent in frontend backend testing documentation; do
            if [ -f "$RESULTS_DIR/${agent}.completed" ]; then
                echo -e "${GREEN}✓ $agent - Completed${NC}"
            elif [ -f "$RESULTS_DIR/${agent}.failed" ]; then
                echo -e "${RED}✗ $agent - Failed${NC}"
            elif tmux has-session -t "cs-${agent}" 2>/dev/null; then
                echo -e "${YELLOW}⚡ $agent - Running${NC}"
                all_completed=false
            else
                echo -e "⏸ $agent - Pending"
                all_completed=false
            fi
        done
        
        echo ""
        echo "Active tmux sessions:"
        tmux ls 2>/dev/null | grep "cs-" || echo "None"
        
        sleep 2
    done
    
    echo -e "\n${GREEN}✓ All agents completed!${NC}"
}

# Функция для сбора результатов
collect_results() {
    echo -e "\n${BLUE}📦 Collecting results...${NC}"
    
    for agent in frontend backend testing documentation; do
        if [ -f "$RESULTS_DIR/${agent}.output" ]; then
            echo -e "\n${GREEN}Results from $agent:${NC}"
            echo "----------------------------------------"
            head -20 "$RESULTS_DIR/${agent}.output"
            echo "... (truncated, see full output in $RESULTS_DIR/${agent}.output)"
        fi
    done
}

# Основной процесс оркестрации
main() {
    # Очистка старых сессий
    echo -e "${YELLOW}Cleaning up old sessions...${NC}"
    tmux ls 2>/dev/null | grep "cs-" | cut -d: -f1 | xargs -I {} tmux kill-session -t {} 2>/dev/null || true
    rm -f "$RESULTS_DIR"/*.completed "$RESULTS_DIR"/*.failed
    
    # Запуск 4 агентов с разными задачами
    
    # Агент 1: Frontend разработчик
    launch_claude_agent "frontend" "Frontend Developer" \
        "Create a modern React application with TypeScript for an e-commerce platform. Include:
        1. Product listing page with filtering and sorting
        2. Product detail page with image gallery
        3. Shopping cart with add/remove functionality
        4. Checkout form with validation
        5. Responsive design with Tailwind CSS
        Use modern React patterns with hooks and context API." \
        ""
    
    # Агент 2: Backend разработчик (зависит от frontend для API контракта)
    launch_claude_agent "backend" "Backend Developer" \
        "Create a Node.js Express backend API for the e-commerce platform. Include:
        1. RESTful endpoints for products (GET, POST, PUT, DELETE)
        2. Shopping cart management endpoints
        3. Order processing endpoints
        4. JWT authentication
        5. Input validation and error handling
        6. PostgreSQL database schema
        Use TypeScript and follow REST best practices." \
        ""
    
    # Агент 3: QA инженер (зависит от frontend и backend)
    launch_claude_agent "testing" "QA Engineer" \
        "Create comprehensive test suites for the e-commerce application:
        1. Unit tests for React components using Jest and React Testing Library
        2. Unit tests for backend API endpoints using Jest
        3. Integration tests for API using Supertest
        4. E2E tests for critical user flows using Cypress
        5. Test data generators and fixtures
        Aim for at least 80% code coverage." \
        "frontend backend"
    
    # Агент 4: DevOps и документация (зависит от всех)
    launch_claude_agent "documentation" "DevOps/Documentation Engineer" \
        "Create infrastructure and documentation for the e-commerce project:
        1. Docker Compose configuration for local development
        2. Dockerfile for frontend and backend
        3. Kubernetes manifests for production deployment
        4. GitHub Actions CI/CD pipeline
        5. Comprehensive README with setup instructions
        6. API documentation using OpenAPI/Swagger
        7. Architecture diagrams
        Include environment variables configuration and security best practices." \
        "frontend backend testing"
    
    # Мониторинг прогресса
    monitor_progress
    
    # Сбор результатов
    collect_results
    
    echo -e "\n${GREEN}✅ Orchestration completed!${NC}"
    echo -e "Results saved in: $RESULTS_DIR"
    echo -e "Logs saved in: $LOGS_DIR"
    
    # Опционально: создание объединенного отчета
    create_summary_report
}

# Функция для создания сводного отчета
create_summary_report() {
    echo -e "\n${BLUE}📄 Creating summary report...${NC}"
    
    cat > "$PROJECT_DIR/claude-orchestration-report.md" << EOF
# Claude Squad Orchestration Report

**Project**: $PROJECT_NAME  
**Date**: $(date)  
**Status**: Completed

## Agent Results Summary

### Frontend Development
$([ -f "$RESULTS_DIR/frontend.completed" ] && echo "✅ Completed successfully" || echo "❌ Failed")

### Backend Development
$([ -f "$RESULTS_DIR/backend.completed" ] && echo "✅ Completed successfully" || echo "❌ Failed")

### Testing Suite
$([ -f "$RESULTS_DIR/testing.completed" ] && echo "✅ Completed successfully" || echo "❌ Failed")

### Documentation & DevOps
$([ -f "$RESULTS_DIR/documentation.completed" ] && echo "✅ Completed successfully" || echo "❌ Failed")

## Generated Files

\`\`\`bash
# Frontend files
$(find "$PROJECT_DIR" -name "*.tsx" -o -name "*.jsx" 2>/dev/null | head -10 || echo "No frontend files found")

# Backend files
$(find "$PROJECT_DIR" -name "*.ts" -path "*/backend/*" 2>/dev/null | head -10 || echo "No backend files found")

# Test files
$(find "$PROJECT_DIR" -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -10 || echo "No test files found")

# Configuration files
$(find "$PROJECT_DIR" -name "Dockerfile" -o -name "docker-compose.yml" -o -name "*.yaml" 2>/dev/null | head -10 || echo "No config files found")
\`\`\`

## Next Steps

1. Review generated code in each agent's output
2. Integrate components together
3. Run tests to ensure everything works
4. Deploy using provided Docker/K8s configurations

## Logs

Detailed logs available in: \`$LOGS_DIR\`
EOF
    
    echo -e "${GREEN}Report saved to: $PROJECT_DIR/claude-orchestration-report.md${NC}"
}

# Функция помощи
show_help() {
    echo "Usage: $0 [project-name] [project-directory]"
    echo ""
    echo "Orchestrates 4 Claude Code agents to build a complete project:"
    echo "  - Frontend Developer"
    echo "  - Backend Developer"
    echo "  - QA Engineer"
    echo "  - DevOps/Documentation Engineer"
    echo ""
    echo "Arguments:"
    echo "  project-name      Name of the project (default: my-project)"
    echo "  project-directory Directory for the project (default: current directory)"
    echo ""
    echo "Example:"
    echo "  $0 ecommerce-app /home/user/projects/ecommerce"
}

# Обработка аргументов
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Проверка зависимостей
command -v claude >/dev/null 2>&1 || { echo -e "${RED}Error: Claude Code is not installed${NC}"; exit 1; }
command -v tmux >/dev/null 2>&1 || { echo -e "${RED}Error: tmux is not installed${NC}"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo -e "${RED}Error: jq is not installed${NC}"; exit 1; }

# Запуск оркестрации
main

# Cleanup на выходе
trap 'echo -e "\n${YELLOW}Cleanup: Killing remaining sessions...${NC}"; tmux ls 2>/dev/null | grep "cs-" | cut -d: -f1 | xargs -I {} tmux kill-session -t {} 2>/dev/null || true' EXIT