#!/bin/bash
# auto-roadmap.sh - Автоматическое создание roadmap и планирование проекта

set -e

PROJECT_NAME="${1:-}"
STACK_CONFIG="${2:-react-node}"
GITHUB_REPO="${3:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Error: Project name is required${NC}"
    echo "Usage: $0 <project-name> [stack-config] [github-repo]"
    exit 1
fi

echo -e "${BLUE}🗺️ Auto Roadmap Generator${NC}"
echo -e "Project: $PROJECT_NAME"
echo -e "Stack: $STACK_CONFIG"
echo ""

# Загружаем конфигурацию стека
STACK_FILE="configs/stacks/${STACK_CONFIG}.json"
if [ ! -f "$STACK_FILE" ]; then
    echo -e "${RED}Error: Stack configuration not found: $STACK_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Generating project roadmap...${NC}"

# Создаем промпт для Claude
ROADMAP_PROMPT="
Based on the following project configuration, create a comprehensive project roadmap:

Project Name: $PROJECT_NAME
Stack Configuration: $(cat "$STACK_FILE")

Generate:
1. Project phases with timelines
2. Milestones and deliverables  
3. GitHub issues breakdown
4. Dependencies and risks
5. Resource allocation

Format the output as a structured markdown document with:
- Executive summary
- Phase breakdown (Planning, Development, Testing, Deployment)
- Milestone definitions
- Issue templates for GitHub
- Risk assessment and mitigation
"

# Запуск Claude для генерации roadmap
echo -e "${GREEN}🤖 Running Claude Planning Agent...${NC}"
claude -p "$ROADMAP_PROMPT" \
    --output-format json \
    --max-turns 5 \
    > "roadmap-${PROJECT_NAME}.json"

# Извлекаем roadmap
jq -r '.result' "roadmap-${PROJECT_NAME}.json" > "roadmap-${PROJECT_NAME}.md"

echo -e "${GREEN}✅ Roadmap generated: roadmap-${PROJECT_NAME}.md${NC}"

# Если указан GitHub репозиторий, создаем issues
if [ -n "$GITHUB_REPO" ]; then
    echo -e "${YELLOW}📝 Creating GitHub issues...${NC}"
    
    # Создаем милestones
    gh api repos/"$GITHUB_REPO"/milestones \
        --method POST \
        --field title="Phase 1: Project Setup" \
        --field description="Initial project setup and architecture" \
        --field due_on="$(date -d '+2 weeks' -u +%Y-%m-%dT%H:%M:%SZ)" \
        2>/dev/null || echo "Milestone already exists or failed to create"
    
    gh api repos/"$GITHUB_REPO"/milestones \
        --method POST \
        --field title="Phase 2: Core Development" \
        --field description="Main feature development and implementation" \
        --field due_on="$(date -d '+6 weeks' -u +%Y-%m-%dT%H:%M:%SZ)" \
        2>/dev/null || echo "Milestone already exists or failed to create"
        
    gh api repos/"$GITHUB_REPO"/milestones \
        --method POST \
        --field title="Phase 3: Testing & QA" \
        --field description="Comprehensive testing and quality assurance" \
        --field due_on="$(date -d '+8 weeks' -u +%Y-%m-%dT%H:%M:%SZ)" \
        2>/dev/null || echo "Milestone already exists or failed to create"
        
    gh api repos/"$GITHUB_REPO"/milestones \
        --method POST \
        --field title="Phase 4: Deployment & Launch" \
        --field description="Production deployment and go-live" \
        --field due_on="$(date -d '+10 weeks' -u +%Y-%m-%dT%H:%M:%SZ)" \
        2>/dev/null || echo "Milestone already exists or failed to create"

    # Создаем базовые issues
    ISSUES=(
        "Setup project structure and dependencies|Phase 1: Project Setup|setup,infrastructure"
        "Implement authentication system|Phase 2: Core Development|feature,auth"
        "Create user interface components|Phase 2: Core Development|feature,frontend"
        "Develop API endpoints|Phase 2: Core Development|feature,backend"
        "Write comprehensive tests|Phase 3: Testing & QA|testing,quality"
        "Setup CI/CD pipeline|Phase 4: Deployment & Launch|devops,deployment"
        "Deploy to production|Phase 4: Deployment & Launch|deployment,release"
    )
    
    for issue_spec in "${ISSUES[@]}"; do
        IFS='|' read -r title milestone labels <<< "$issue_spec"
        
        gh issue create \
            --repo "$GITHUB_REPO" \
            --title "$title" \
            --body "Automatically generated issue from roadmap planning.

**Stack:** $STACK_CONFIG
**Project:** $PROJECT_NAME

This issue is part of the automated project roadmap. Please review and update as needed." \
            --label "$labels" \
            --milestone "$milestone" \
            2>/dev/null || echo "Failed to create issue: $title"
    done
    
    echo -e "${GREEN}✅ GitHub issues and milestones created${NC}"
fi

# Создаем проектную доску если указан репозиторий
if [ -n "$GITHUB_REPO" ]; then
    echo -e "${YELLOW}📊 Creating GitHub Project board...${NC}"
    
    # Создаем проект через Claude для более детальной настройки
    PROJECT_PROMPT="
Create a GitHub Projects v2 configuration for project: $PROJECT_NAME

Generate:
1. Project board structure with appropriate columns
2. Custom fields for tracking
3. Automation rules
4. Views for different stakeholders

Output as GitHub CLI commands to set up the project board.
"

    claude -p "$PROJECT_PROMPT" \
        --output-format json \
        --max-turns 3 \
        > "project-board-${PROJECT_NAME}.json"
        
    jq -r '.result' "project-board-${PROJECT_NAME}.json" > "project-board-${PROJECT_NAME}.sh"
    chmod +x "project-board-${PROJECT_NAME}.sh"
    
    echo -e "${GREEN}✅ Project board script generated: project-board-${PROJECT_NAME}.sh${NC}"
fi

echo -e "${BLUE}📋 Roadmap Summary:${NC}"
echo -e "- Roadmap document: roadmap-${PROJECT_NAME}.md"
echo -e "- Planning data: roadmap-${PROJECT_NAME}.json"
if [ -n "$GITHUB_REPO" ]; then
    echo -e "- GitHub issues created in: $GITHUB_REPO"
    echo -e "- Project board script: project-board-${PROJECT_NAME}.sh"
fi

echo -e "\n${GREEN}🎉 Project planning completed!${NC}"