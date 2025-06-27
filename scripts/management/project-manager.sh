#!/bin/bash
# project-manager.sh - Автоматизированное управление GitHub проектами

set -e

ACTION="${1:-status}"
PROJECT_NAME="${2:-}"
GITHUB_REPO="${3:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    echo "Usage: $0 <action> [project-name] [github-repo]"
    echo ""
    echo "Actions:"
    echo "  status      - Show project status and metrics"
    echo "  create      - Create new project with automated setup"
    echo "  update      - Update project status and boards"
    echo "  analyze     - Analyze project performance and issues"
    echo "  report      - Generate comprehensive project report"
    echo "  cleanup     - Clean up completed/stale issues"
    echo ""
    echo "Examples:"
    echo "  $0 status my-project eagurin/my-repo"
    echo "  $0 create e-commerce-app eagurin/ecommerce"
    echo "  $0 analyze mobile-app eagurin/flutter-app"
}

# Функция для получения статуса проекта
get_project_status() {
    local repo="$1"
    
    echo -e "${BLUE}📊 Project Status for $repo${NC}"
    echo ""
    
    # Получаем метрики репозитория
    echo -e "${YELLOW}Repository Metrics:${NC}"
    gh api repos/"$repo" --jq '.
    | "Stars: " + (.stargazers_count | tostring) + 
      " | Forks: " + (.forks_count | tostring) + 
      " | Issues: " + (.open_issues_count | tostring) +
      " | Language: " + .language'
    
    # Получаем активные PR
    echo -e "\n${YELLOW}Active Pull Requests:${NC}"
    gh pr list --repo "$repo" --json number,title,author,createdAt | \
        jq -r '.[] | "PR #" + (.number | tostring) + ": " + .title + " (@" + .author.login + ")"' | head -5
    
    # Получаем недавние issues
    echo -e "\n${YELLOW}Recent Issues:${NC}"
    gh issue list --repo "$repo" --json number,title,state,createdAt | \
        jq -r '.[] | "#" + (.number | tostring) + ": " + .title + " [" + .state + "]"' | head -5
        
    # Получаем milestone прогресс
    echo -e "\n${YELLOW}Milestone Progress:${NC}"
    gh api repos/"$repo"/milestones --jq '.[] | select(.state == "open") | 
        .title + ": " + (.closed_issues | tostring) + "/" + 
        ((.open_issues + .closed_issues) | tostring) + " issues"' | head -3
}

# Функция для создания проекта
create_project() {
    local project_name="$1"
    local repo="$2"
    
    echo -e "${BLUE}🚀 Creating automated project: $project_name${NC}"
    
    # Создаем проект через GitHub API
    PROJECT_PROMPT="
You are a GitHub Project Manager. Create a comprehensive project setup for: $project_name

Generate:
1. Project description and goals
2. Milestone structure with timelines
3. Issue templates for different types of work
4. Project board configuration with columns
5. Labels and automation rules

Output as GitHub CLI commands and configuration.
"

    claude -p "$PROJECT_PROMPT" \
        --output-format json \
        --max-turns 5 \
        > "project-setup-${project_name}.json"
        
    jq -r '.result' "project-setup-${project_name}.json" > "project-setup-${project_name}.sh"
    chmod +x "project-setup-${project_name}.sh"
    
    echo -e "${GREEN}✅ Project setup script generated: project-setup-${project_name}.sh${NC}"
    echo -e "${YELLOW}Review and run the script to complete project creation.${NC}"
}

# Функция для анализа проекта
analyze_project() {
    local repo="$1"
    
    echo -e "${BLUE}🔍 Analyzing project performance: $repo${NC}"
    
    # Собираем данные для анализа
    echo -e "${YELLOW}Collecting project data...${NC}"
    
    # Получаем commits за последний месяц
    gh api repos/"$repo"/commits --paginate | \
        jq '[.[] | select(.commit.author.date | fromnow | . < (30 * 24 * 60 * 60))] | length' > commits_count.tmp
        
    # Получаем PR метрики
    gh pr list --repo "$repo" --state all --json number,createdAt,closedAt,author | \
        jq 'length' > pr_count.tmp
        
    # Получаем issue метрики
    gh issue list --repo "$repo" --state all --json number,createdAt,closedAt,labels | \
        jq 'length' > issue_count.tmp
        
    # Создаем анализ через Claude
    ANALYSIS_PROMPT="
You are a project analytics expert. Analyze this GitHub repository data:

Repository: $repo
Recent commits (30 days): $(cat commits_count.tmp)
Total PRs: $(cat pr_count.tmp)
Total issues: $(cat issue_count.tmp)

Recent activity:
$(gh api repos/"$repo"/commits | jq -r '.[0:5][] | .commit.message' | head -10)

Generate:
1. Project health assessment
2. Development velocity analysis
3. Team collaboration insights
4. Risk identification
5. Recommendations for improvement
6. KPI dashboard suggestions

Provide actionable insights and specific recommendations.
"

    claude -p "$ANALYSIS_PROMPT" \
        --output-format json \
        --max-turns 5 \
        > "analysis-${repo//\//-}.json"
        
    jq -r '.result' "analysis-${repo//\//-}.json" > "analysis-${repo//\//-}.md"
    
    # Cleanup temp files
    rm -f *.tmp
    
    echo -e "${GREEN}✅ Analysis completed: analysis-${repo//\//-}.md${NC}"
}

# Функция для создания отчета
generate_report() {
    local repo="$1"
    
    echo -e "${BLUE}📄 Generating comprehensive project report: $repo${NC}"
    
    # Собираем все данные
    echo -e "${YELLOW}Gathering comprehensive data...${NC}"
    
    REPORT_PROMPT="
Generate a comprehensive project report for GitHub repository: $repo

Include:
1. Executive Summary
2. Project Timeline and Milestones
3. Development Metrics and KPIs
4. Team Performance Analysis
5. Code Quality Assessment
6. Security and Compliance Status
7. Risk Assessment
8. Future Roadmap Recommendations

Repository data:
$(gh repo view "$repo" --json description,createdAt,updatedAt,stargazerCount,forkCount,languages)

Recent activity:
$(gh api repos/"$repo"/commits | jq -r '.[0:10][] | .commit.message + " - " + .commit.author.name')

Format as a professional project report with metrics, charts suggestions, and actionable insights.
"

    claude -p "$REPORT_PROMPT" \
        --output-format json \
        --max-turns 8 \
        > "report-${repo//\//-}.json"
        
    jq -r '.result' "report-${repo//\//-}.json" > "report-${repo//\//-}.md"
    
    echo -e "${GREEN}✅ Report generated: report-${repo//\//-}.md${NC}"
}

# Функция для обновления проекта
update_project() {
    local repo="$1"
    
    echo -e "${BLUE}🔄 Updating project status: $repo${NC}"
    
    # Автоматическое закрытие старых issues
    echo -e "${YELLOW}Checking for stale issues...${NC}"
    
    # Находим issues старше 30 дней без активности
    gh issue list --repo "$repo" --state open --json number,updatedAt | \
        jq -r '.[] | select(.updatedAt | fromnow | . > (30 * 24 * 60 * 60)) | .number' | \
        while read -r issue_num; do
            echo "Found stale issue #$issue_num"
            gh issue comment "$issue_num" --repo "$repo" --body "This issue has been inactive for 30+ days. Please update if still relevant, or it will be closed automatically."
        done
        
    # Обновляем project boards
    echo -e "${YELLOW}Updating project boards...${NC}"
    
    UPDATE_PROMPT="
Review the current state of repository $repo and suggest project updates:

Current issues:
$(gh issue list --repo "$repo" --json number,title,state,labels | head -20)

Recent PRs:
$(gh pr list --repo "$repo" --json number,title,state | head -10)

Generate:
1. Board updates needed
2. Label reorganization suggestions  
3. Milestone adjustments
4. Automation rule improvements
5. Workflow optimizations

Provide specific GitHub CLI commands to implement updates.
"

    claude -p "$UPDATE_PROMPT" \
        --output-format json \
        --max-turns 5 \
        > "updates-${repo//\//-}.json"
        
    jq -r '.result' "updates-${repo//\//-}.json" > "updates-${repo//\//-}.sh"
    chmod +x "updates-${repo//\//-}.sh"
    
    echo -e "${GREEN}✅ Update script generated: updates-${repo//\//-}.sh${NC}"
}

# Главная функция
main() {
    case "$ACTION" in
        "status")
            if [ -z "$GITHUB_REPO" ]; then
                echo -e "${RED}Error: GitHub repository is required for status${NC}"
                show_help
                exit 1
            fi
            get_project_status "$GITHUB_REPO"
            ;;
        "create")
            if [ -z "$PROJECT_NAME" ] || [ -z "$GITHUB_REPO" ]; then
                echo -e "${RED}Error: Project name and GitHub repo are required${NC}"
                show_help
                exit 1
            fi
            create_project "$PROJECT_NAME" "$GITHUB_REPO"
            ;;
        "analyze")
            if [ -z "$GITHUB_REPO" ]; then
                echo -e "${RED}Error: GitHub repository is required for analysis${NC}"
                show_help
                exit 1
            fi
            analyze_project "$GITHUB_REPO"
            ;;
        "report")
            if [ -z "$GITHUB_REPO" ]; then
                echo -e "${RED}Error: GitHub repository is required for report${NC}"
                show_help
                exit 1
            fi
            generate_report "$GITHUB_REPO"
            ;;
        "update")
            if [ -z "$GITHUB_REPO" ]; then
                echo -e "${RED}Error: GitHub repository is required for update${NC}"
                show_help
                exit 1
            fi
            update_project "$GITHUB_REPO"
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            echo -e "${RED}Error: Unknown action: $ACTION${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Проверка зависимостей
command -v gh >/dev/null 2>&1 || { echo -e "${RED}Error: GitHub CLI is not installed${NC}"; exit 1; }
command -v claude >/dev/null 2>&1 || { echo -e "${RED}Error: Claude Code is not installed${NC}"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo -e "${RED}Error: jq is not installed${NC}"; exit 1; }

# Запуск
main