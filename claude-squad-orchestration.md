# 🎭 Claude Squad Orchestration System

Система автоматизированной оркестрации множественных Claude Code агентов для параллельной разработки проектов.

## 📋 Содержание

1. [Архитектура системы](#архитектура-системы)
2. [Быстрый старт](#быстрый-старт)
3. [Основные компоненты](#основные-компоненты)
4. [Использование](#использование)
5. [Мониторинг](#мониторинг)
6. [Конфигурация](#конфигурация)

## 🏗️ Архитектура системы

Система управляет 4 специализированными AI-агентами, работающими параллельно:

```text
┌─────────────────────────────────────────────────────────┐
│                 Claude Orchestrator                     │
└─────────────────────┬───────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐  ┌────▼────┐  ┌────▼────┐  ┌──▼──────┐
│Frontend│  │Backend  │  │Testing  │  │DevOps   │
│React   │  │Node.js  │  │Jest     │  │Docker   │
│TypeScript│ │Express  │  │Cypress  │  │K8s      │
└────────┘  └─────────┘  └─────────┘  └─────────┘
```

### Специализация агентов

- **Frontend**: React/TypeScript компоненты, UI/UX
- **Backend**: Node.js/Express API, база данных
- **Testing**: Unit/Integration/E2E тесты
- **DevOps**: Docker, Kubernetes, CI/CD, документация

## 🚀 Быстрый старт

### Установка зависимостей

```bash
# Основные зависимости
brew install jq tmux    # JSON парсинг и сессии
npm install -g node     # Для бенчмарков

# Проверка Claude Code
claude --version
```

### Запуск простого примера

```bash
# Клонируйте проект
git clone <repository-url>
cd claude-squad-orchestration

# Запустите быстрый пример
./scripts/utils/quick-start-orchestration.sh

# Мониторинг прогресса
watch 'tmux ls | grep cs-'
```

### Создание полного проекта

```bash
# Запуск основного оркестратора
./scripts/core/cs-claude-orchestrator.sh my-ecommerce ~/projects/my-ecommerce

# Результаты появятся в:
# ~/projects/my-ecommerce/claude-results/
```

## 🔧 Основные компоненты

### Основные скрипты

#### `cs-claude-orchestrator.sh`
Главный оркестратор для создания полноценных проектов:

- Управляет 4 специализированными агентами
- Обрабатывает зависимости между агентами
- Создает e-commerce платформу с нуля
- Генерирует отчеты о выполнении

```bash
./scripts/core/cs-claude-orchestrator.sh [project-name] [project-dir]
```

#### `quick-start-orchestration.sh`
Простой пример для изучения системы:

- Создает базовое todo-приложение
- 4 агента работают параллельно
- Быстрый результат за ~5 минут

```bash
./scripts/utils/quick-start-orchestration.sh
```

#### `benchmark.js`
Тестирование производительности системы:

- Измеряет скорость API endpoints
- Проверяет параллельную обработку
- Генерирует подробные отчеты

```bash
node scripts/utils/benchmark.js
```

## 💻 Использование

### Структура результатов

После выполнения скрипты создают следующую структуру:

```
project-directory/
├── claude-results/           # Результаты агентов
│   ├── frontend.json        # JSON ответ от Frontend агента
│   ├── backend.json         # JSON ответ от Backend агента
│   ├── testing.json         # JSON ответ от Testing агента
│   ├── documentation.json   # JSON ответ от DevOps агента
│   ├── frontend.output      # Извлеченный результат
│   ├── backend.output       # Извлеченный результат
│   └── ...
├── claude-logs/             # Логи выполнения
│   ├── frontend.sh          # Скрипт Frontend агента
│   ├── frontend.error       # Ошибки Frontend агента
│   └── ...
└── claude-orchestration-report.md  # Сводный отчет
```

### Основные команды

```bash
# Запуск полного проекта
./scripts/core/cs-claude-orchestrator.sh my-project ~/projects

# Быстрый пример
./scripts/utils/quick-start-orchestration.sh

# Мониторинг активных агентов
watch 'tmux ls | grep cs-'

# Просмотр логов
tail -f claude-logs/frontend.error

# Остановка всех агентов
tmux ls | grep cs- | cut -d: -f1 | xargs -I {} tmux kill-session -t {}

# Очистка результатов
rm -rf claude-results/ claude-logs/
```

### Кастомизация агентов

Отредактируйте промпты в `scripts/core/cs-claude-orchestrator.sh`:

```bash
# Пример изменения Frontend агента
launch_claude_agent "frontend" "Frontend Developer" \
    "Create a Vue.js application instead of React..." \
    ""
```

## 🖥️ Мониторинг

### Отслеживание прогресса

```bash
# Активные сессии tmux
tmux ls | grep cs-

# Статус агентов в реальном времени
watch 'ls -la claude-results/*.completed claude-results/*.failed 2>/dev/null'

# Просмотр логов
tail -f claude-logs/frontend.error claude-logs/backend.error

# Системные ресурсы
htop  # CPU/Memory использование Claude процессов
```

### Встроенный монитор

Основной оркестратор включает интерактивный монитор:

```text
🎭 Claude Squad Orchestrator - Progress
Time: 14:23:45

✓ frontend - Completed
⚡ backend - Running  
⏸ testing - Pending
⏸ documentation - Pending

Active tmux sessions:
cs-backend: 1 windows (created Thu Jun 27 14:22:15 2025)
```

### Результаты и отчеты

```bash
# Краткий обзор результатов
head -20 claude-results/*.output

# Полный отчет проекта
cat claude-orchestration-report.md

# Проверка созданных файлов
find . -name "*.tsx" -o -name "*.ts" -o -name "Dockerfile" | head -20
```

## ⚙️ Конфигурация

### Переменные окружения

```bash
# Базовые настройки
export CLAUDE_MAX_TURNS=10          # Максимум итераций на агента
export CLAUDE_OUTPUT_FORMAT="json"  # Всегда JSON для парсинга
export CS_AUTO_ACCEPT=true          # Автоматическое подтверждение

# Пути
export CLAUDE_ORCHESTRATION_DIR="$PWD"
export RESULTS_DIR="$PWD/claude-results"
export LOGS_DIR="$PWD/claude-logs"
```

### Требования к системе

- **Claude Code**: Установлен и настроен с API ключом
- **tmux**: Для управления сессиями `brew install tmux`
- **jq**: Для обработки JSON `brew install jq`  
- **Node.js**: Для benchmark скрипта (опционально)

### Устранение проблем

```bash
# Проверка Claude Code
claude --version
claude -p "test" --max-turns 1

# Проверка зависимостей
command -v tmux && echo "✓ tmux" || echo "✗ tmux missing"
command -v jq && echo "✓ jq" || echo "✗ jq missing"

# Очистка зависших процессов
tmux kill-server  # Убивает все tmux сессии
pkill -f "claude"  # Убивает все Claude процессы
```

## 📋 Лучшие практики

- **JSON формат**: Всегда используйте `--output-format json`
- **Ограничение итераций**: Устанавливайте `--max-turns` для контроля времени
- **Мониторинг ресурсов**: Следите за CPU/памятью при множественных агентах
- **Версионирование**: Храните промпты в git для воспроизводимости
- **Логирование**: Проверяйте `claude-logs/*.error` при ошибках
- **Очистка**: Регулярно удаляйте старые результаты и сессии

## 🎯 Заключение

Claude Squad Orchestration System автоматизирует создание полноценных проектов с помощью 4 специализированных AI-агентов. Система позволяет:

- **Параллельная разработка**: Frontend, Backend, Testing, DevOps одновременно
- **Управление зависимостями**: Агенты ждут завершения предыдущих этапов
- **Полная автоматизация**: От идеи до развертывания без участия человека
- **Мониторинг и отчетность**: Отслеживание прогресса и детальные отчеты

Начните с `scripts/utils/quick-start-orchestration.sh` для изучения системы, затем переходите к `scripts/core/cs-claude-orchestrator.sh` для создания реальных проектов.

---
*Обновлено: 27 июня 2025*
