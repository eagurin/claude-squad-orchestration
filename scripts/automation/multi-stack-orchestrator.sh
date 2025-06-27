#!/bin/bash
# multi-stack-orchestrator.sh - Универсальный оркестратор для любых стеков

set -e

PROJECT_NAME="${1:-}"
STACK_CONFIG="${2:-react-node}"
PROJECT_DIR="${3:-$(pwd)}"
GITHUB_REPO="${4:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Error: Project name is required${NC}"
    echo "Usage: $0 <project-name> [stack-config] [project-directory] [github-repo]"
    echo ""
    echo "Available stacks:"
    find configs/stacks/ -name "*.json" -exec basename {} .json \; 2>/dev/null || echo "  - No stack configs found"
    exit 1
fi

RESULTS_DIR="$PROJECT_DIR/claude-results"
LOGS_DIR="$PROJECT_DIR/claude-logs"
STACK_FILE="configs/stacks/${STACK_CONFIG}.json"

# Проверяем конфигурацию стека
if [ ! -f "$STACK_FILE" ]; then
    echo -e "${RED}Error: Stack configuration not found: $STACK_FILE${NC}"
    echo "Available stacks:"
    find configs/stacks/ -name "*.json" -exec basename {} .json \;
    exit 1
fi

mkdir -p "$RESULTS_DIR" "$LOGS_DIR"

echo -e "${BLUE}🎭 Multi-Stack Claude Squad Orchestrator${NC}"
echo -e "Project: $PROJECT_NAME"
echo -e "Stack: $(jq -r '.name' "$STACK_FILE")"
echo -e "Directory: $PROJECT_DIR"
echo ""

# Функция для запуска специализированного агента
launch_specialized_agent() {
    local agent_name="$1"
    local agent_config="$2"
    local dependencies="$3"
    
    local role=$(echo "$agent_config" | jq -r '.role')
    local expertise=$(echo "$agent_config" | jq -r '.expertise | join(", ")')
    local responsibilities=$(echo "$agent_config" | jq -r '.responsibilities | join("; ")')
    
    echo -e "${YELLOW}🚀 Launching $role ($agent_name)${NC}"
    echo -e "Expertise: $expertise"
    
    # Создаем специализированный промпт на основе конфигурации стека
    local agent_prompt="
You are a $role specializing in $(jq -r '.name' "$STACK_FILE").

**Your Expertise:** $expertise

**Your Responsibilities:** $responsibilities

**Stack Configuration:**
$(cat "$STACK_FILE")

**Project Details:**
- Name: $PROJECT_NAME
- Type: $(jq -r '.description' "$STACK_FILE")
- Target Directory: $PROJECT_DIR

**Your Mission:**
Create a production-ready implementation for your area of expertise.

$responsibilities

**Technical Requirements:**
$(echo "$agent_config" | jq -r '.expertise | map("- " + .) | join("\n")')

**Project Structure:**
$(jq -r '.project_structure | to_entries | map(.key + ": " + .value) | join("\n")' "$STACK_FILE")

Please create comprehensive, production-ready code following best practices for this stack.
Include all necessary configuration files, documentation, and tests.
"

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
echo "Starting specialized $role agent..."
claude -p "$agent_prompt" \\
    --output-format json \\
    --max-turns 15 \\
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
    echo -e "\n${BLUE}📊 Monitoring multi-stack development...${NC}"
    
    local all_completed=false
    local agents=($(jq -r '.agents | keys[]' "$STACK_FILE"))
    
    while [ "$all_completed" = false ]; do
        clear
        echo -e "${BLUE}🎭 Multi-Stack Orchestrator - Progress${NC}"
        echo -e "Stack: $(jq -r '.name' "$STACK_FILE")"
        echo -e "Time: $(date '+%H:%M:%S')"
        echo ""
        
        all_completed=true
        
        for agent in "${agents[@]}"; do
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
        
        sleep 3
    done
    
    echo -e "\n${GREEN}✓ All specialized agents completed!${NC}"
}

# Главная функция оркестрации
main() {
    # Очистка старых сессий
    echo -e "${YELLOW}Cleaning up old sessions...${NC}"
    tmux ls 2>/dev/null | grep "cs-" | cut -d: -f1 | xargs -I {} tmux kill-session -t {} 2>/dev/null || true
    rm -f "$RESULTS_DIR"/*.completed "$RESULTS_DIR"/*.failed
    
    # Если указан GitHub репозиторий, создаем автоматический roadmap
    if [ -n "$GITHUB_REPO" ]; then
        echo -e "${YELLOW}🗺️ Creating project roadmap...${NC}"
        ./scripts/planning/auto-roadmap.sh "$PROJECT_NAME" "$STACK_CONFIG" "$GITHUB_REPO"
    fi
    
    # Получаем список агентов из конфигурации стека
    local agents=($(jq -r '.agents | keys[]' "$STACK_FILE"))
    
    echo -e "${BLUE}Launching ${#agents[@]} specialized agents for $(jq -r '.name' "$STACK_FILE"):${NC}"
    
    # Запускаем агентов согласно конфигурации стека
    for agent in "${agents[@]}"; do
        local agent_config=$(jq -c ".agents.$agent" "$STACK_FILE")
        
        # Определяем зависимости (простая логика)
        local dependencies=""
        case "$agent" in
            "testing")
                dependencies="frontend backend"
                ;;
            "devops")
                dependencies="frontend backend testing"
                ;;
        esac
        
        launch_specialized_agent "$agent" "$agent_config" "$dependencies"
        sleep 2  # Небольшая пауза между запусками
    done
    
    # Мониторинг прогресса
    monitor_progress
    
    # Сбор и анализ результатов
    collect_results
    
    # Создание итогового отчета
    create_project_summary
    
    echo -e "\n${GREEN}✅ Multi-stack orchestration completed!${NC}"
    echo -e "Results saved in: $RESULTS_DIR"
    echo -e "Logs saved in: $LOGS_DIR"
}

# Функция для сбора результатов
collect_results() {
    echo -e "\n${BLUE}📦 Collecting results from all agents...${NC}"
    
    local agents=($(jq -r '.agents | keys[]' "$STACK_FILE"))
    
    for agent in "${agents[@]}"; do
        if [ -f "$RESULTS_DIR/${agent}.output" ]; then
            local role=$(jq -r ".agents.$agent.role" "$STACK_FILE")
            echo -e "\n${GREEN}Results from $role ($agent):${NC}"
            echo "----------------------------------------"
            head -20 "$RESULTS_DIR/${agent}.output"
            echo "... (see full output in $RESULTS_DIR/${agent}.output)"
        fi
    done
}

# Функция для создания итогового отчета проекта
create_project_summary() {
    echo -e "\n${BLUE}📄 Creating project summary...${NC}"
    
    local agents=($(jq -r '.agents | keys[]' "$STACK_FILE"))
    
    cat > "$PROJECT_DIR/project-summary.md" << EOF
# $PROJECT_NAME - Project Summary

**Stack:** $(jq -r '.name' "$STACK_FILE")  
**Generated:** $(date)  
**Description:** $(jq -r '.description' "$STACK_FILE")

## Technology Stack

$(jq -r '.technologies | to_entries[] | "### " + (.key | ascii_upcase) + "\n" + (.value | to_entries[] | "- **" + .key + ":** " + .value) + "\n"' "$STACK_FILE")

## Agent Results Summary

$(for agent in "${agents[@]}"; do
    role=$(jq -r ".agents.$agent.role" "$STACK_FILE")
    if [ -f "$RESULTS_DIR/${agent}.completed" ]; then
        echo "### $role ✅"
        echo "Status: Completed successfully"
    elif [ -f "$RESULTS_DIR/${agent}.failed" ]; then
        echo "### $role ❌"
        echo "Status: Failed"
    else
        echo "### $role ⏸"
        echo "Status: Pending"
    fi
    echo ""
done)

## Project Structure

\`\`\`
$(jq -r '.project_structure | to_entries[] | .value + " - " + .key' "$STACK_FILE")
\`\`\`

## Next Steps

1. Review generated code in each agent's output
2. Integrate components together  
3. Run tests to ensure everything works
4. Deploy using provided infrastructure configuration

## Generated Files

$(find "$PROJECT_DIR" -name "*.json" -o -name "*.md" -o -name "*.sh" | grep -v node_modules | head -20)

---
*Generated by Multi-Stack Claude Squad Orchestrator*
EOF
    
    echo -e "${GREEN}Project summary saved to: $PROJECT_DIR/project-summary.md${NC}"
}

# Проверка зависимостей
command -v claude >/dev/null 2>&1 || { echo -e "${RED}Error: Claude Code is not installed${NC}"; exit 1; }
command -v tmux >/dev/null 2>&1 || { echo -e "${RED}Error: tmux is not installed${NC}"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo -e "${RED}Error: jq is not installed${NC}"; exit 1; }

# Запуск оркестрации
main

# Cleanup на выходе
trap 'echo -e "\n${YELLOW}Cleanup: Killing remaining sessions...${NC}"; tmux ls 2>/dev/null | grep "cs-" | cut -d: -f1 | xargs -I {} tmux kill-session -t {} 2>/dev/null || true' EXIT