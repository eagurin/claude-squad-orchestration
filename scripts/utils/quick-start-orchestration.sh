#!/bin/bash
# quick-start-orchestration.sh - Быстрый запуск 4 Claude агентов для проекта

# Простой пример запуска 4 агентов через Claude Squad
# Каждый агент работает над своей частью проекта параллельно

echo "🚀 Quick Start: Claude Squad + Claude Code Orchestration"
echo "========================================================"

# 1. Frontend агент - создает React компоненты
tmux new-session -d -s "cs-frontend" '
claude -p "Create a React TodoList component with add, delete, and toggle functionality. Use TypeScript and modern hooks." \
  --output-format json \
  --max-turns 5 \
  > frontend-result.json
'

# 2. Backend агент - создает API
tmux new-session -d -s "cs-backend" '
claude -p "Create an Express.js REST API for a todo application with endpoints: GET /todos, POST /todos, DELETE /todos/:id, PUT /todos/:id. Use TypeScript." \
  --output-format json \
  --max-turns 5 \
  > backend-result.json
'

# 3. Testing агент - пишет тесты
tmux new-session -d -s "cs-testing" '
sleep 10  # Ждем пока создадутся компоненты
claude -p "Write Jest unit tests for a React TodoList component and Express.js todo API endpoints." \
  --output-format json \
  --max-turns 5 \
  > testing-result.json
'

# 4. DevOps агент - создает Docker и документацию
tmux new-session -d -s "cs-devops" '
claude -p "Create a Docker Compose setup for a React frontend and Express backend todo app. Include Dockerfile for both services and a README with setup instructions." \
  --output-format json \
  --max-turns 5 \
  > devops-result.json
'

echo "✅ Запущено 4 агента:"
echo "  - Frontend (React components)"
echo "  - Backend (Express API)"
echo "  - Testing (Jest tests)"
echo "  - DevOps (Docker + docs)"

echo ""
echo "📊 Мониторинг прогресса:"
echo "  watch 'tmux ls | grep cs-'"

echo ""
echo "📁 Результаты будут в файлах:"
echo "  - frontend-result.json"
echo "  - backend-result.json"
echo "  - testing-result.json"
echo "  - devops-result.json"

echo ""
echo "🛑 Остановить все агенты:"
echo "  tmux kill-server"