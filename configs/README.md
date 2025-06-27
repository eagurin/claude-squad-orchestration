# 🔧 Configuration System

Система конфигурации для мультистекового Claude Squad Orchestrator.

## 📁 Структура

```
configs/
├── stacks/           # Конфигурации технологических стеков
├── agents/           # Настройки специализированных агентов
├── workflows/        # GitHub Actions templates
└── README.md         # Эта документация
```

## 🛠️ Стеки (Technology Stacks)

### Доступные стеки

#### React + Node.js (`react-node.json`)
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + PostgreSQL + Prisma
- **Testing**: Jest + React Testing Library + Cypress
- **DevOps**: Docker + Kubernetes + GitHub Actions

#### Vue.js + Python (`vue-python.json`)
- **Frontend**: Vue.js 3 + TypeScript + Tailwind CSS + Vite  
- **Backend**: Python + FastAPI + SQLAlchemy + PostgreSQL
- **Testing**: Vitest + Vue Test Utils + Playwright
- **DevOps**: Docker + Kubernetes + GitHub Actions

#### Flutter + Go (`flutter-go.json`)
- **Frontend**: Flutter + Dart + Bloc/Cubit
- **Backend**: Go + Gin/Fiber + GORM + PostgreSQL
- **Testing**: flutter_test + Go testing + integration tests
- **DevOps**: Docker + Mobile CI/CD + App Store deployment

### Структура конфигурации стека

```json
{
  "name": "Human-readable name",
  "id": "unique-identifier",
  "description": "Brief description",
  "technologies": {
    "frontend": { /* frontend tech */ },
    "backend": { /* backend tech */ },
    "devops": { /* devops tech */ }
  },
  "agents": {
    "frontend": {
      "role": "Agent role",
      "expertise": ["tech1", "tech2"],
      "responsibilities": ["task1", "task2"]
    }
  },
  "project_structure": { /* directory layout */ },
  "dependencies": { /* package dependencies */ }
}
```

## 🤖 Агенты (Specialized Agents)

Каждый агент специализируется на определенной области:

### Frontend Agent
- Создание UI компонентов
- Responsive design
- Build конфигурация
- Frontend тестирование

### Backend Agent  
- API разработка
- База данных
- Аутентификация
- Backend тестирование

### Testing Agent
- Unit тесты
- Integration тесты
- E2E тестирование
- Coverage отчеты

### DevOps Agent
- Контейнеризация
- CI/CD pipelines
- Мониторинг
- Deployment

## 🔄 GitHub Workflows

### Smart Review (`smart-review.yml`)
- Автоматический code review для PR
- Поддержка разных стеков
- Детекция технологий
- Настраиваемая глубина анализа

**Триггеры:**
- Новые/обновленные PR
- Комментарии с `@claude review`
- Опциональные параметры: `quick`, `standard`, `thorough`, `security`

### Auto Planning
- Автоматическое создание roadmap
- GitHub issues и milestones
- Project boards
- Триггер: `@claude plan` в issues

## 🚀 Использование

### Выбор стека

```bash
# Просмотр доступных стеков
ls configs/stacks/

# Запуск с конкретным стеком
./scripts/automation/multi-stack-orchestrator.sh my-project vue-python
```

### Создание нового стека

1. Скопируйте существующий конфигурационный файл
2. Измените технологии и зависимости
3. Настройте агентов под новый стек
4. Обновите project_structure

### Настройка GitHub интеграции

1. Скопируйте workflow файлы в `.github/workflows/`
2. Настройте секреты: `ANTHROPIC_API_KEY`
3. Активируйте GitHub Apps права
4. Настройте webhook события

## 📊 Мониторинг и аналитика

Система собирает метрики:
- Время выполнения агентов
- Качество кода
- Test coverage
- Performance метрики
- Security assessments

## 🔧 Расширение системы

### Добавление нового стека

1. Создайте JSON конфигурацию в `configs/stacks/`
2. Определите агентов и их роли
3. Настройте dependencies и project structure
4. Протестируйте с `multi-stack-orchestrator.sh`

### Кастомизация агентов

1. Измените `responsibilities` в конфигурации стека
2. Добавьте новые `expertise` области
3. Настройте специфичные промпты
4. Обновите dependencies при необходимости

### Интеграция с внешними сервисами

- API ключи через environment variables
- Webhook интеграции для мониторинга
- External service конфигурации
- Custom deployment targets

## 🛡️ Безопасность

- API ключи только в secrets
- Никаких hardcoded credentials
- Minimal permissions для агентов
- Audit logs для всех операций

---

Конфигурационная система позволяет легко адаптировать Claude Squad под любой технологический стек и workflow!