# Scripts Directory

Организованная коллекция скриптов для Claude Squad Orchestration System.

## 📁 Структура директорий

```
scripts/
├── core/           # Основные скрипты оркестрации
├── setup/          # Скрипты установки и настройки
├── github/         # GitHub интеграция
├── utils/          # Утилиты и вспомогательные инструменты
└── README.md       # Эта документация
```

## 🔧 Core - Основные скрипты

### `cs-claude-orchestrator.sh`

**Главный оркестратор системы**

- Управляет 4 специализированными AI-агентами
- Создает полноценные e-commerce проекты
- Обрабатывает зависимости между агентами
- Генерирует отчеты и мониторинг

```bash
# Использование
./core/cs-claude-orchestrator.sh [project-name] [project-directory]

# Пример
./core/cs-claude-orchestrator.sh my-shop ~/projects/my-shop
```

### `cynosure-local.sh`

**Локальное управление Cynosure Bridge**

- Запуск/остановка локального сервера
- Проверка состояния и логов
- API тестирование

```bash
# Команды
./core/cynosure-local.sh start     # Запуск сервера
./core/cynosure-local.sh stop      # Остановка
./core/cynosure-local.sh status    # Статус
./core/cynosure-local.sh test      # Тестирование API
```

### `cynosure-factory-simple.sh`

**Упрощенная производственная фабрика**

- Управление production развертыванием
- Мониторинг сервисов
- Health checks

```bash
./core/cynosure-factory-simple.sh [action]
```

## ⚙️ Setup - Установка и настройка

### `all-in-one-setup.sh`

**Автоматическая установка системы**

- Проверка зависимостей
- Сборка и настройка
- Инициализация окружения

```bash
./setup/all-in-one-setup.sh
```

### `setup-runner.sh`

**Настройка GitHub Actions runner**

- Конфигурация self-hosted runner
- Автоматизация CI/CD
- Проверка статуса

```bash
./setup/setup-runner.sh
```

## 🐙 GitHub - Интеграция с GitHub

### `auto-create-github-app.sh`

**Автоматическое создание GitHub App**

- API-based создание приложения
- Конфигурация permissions
- Валидация настроек

```bash
./github/auto-create-github-app.sh
```

### `create-github-app.sh`

**Ручное создание GitHub App**

- Генерация манифеста
- Инструкции по настройке
- Fallback для auto-create

```bash
./github/create-github-app.sh
```

### `add-github-secrets.sh`

**Добавление секретов в репозиторий**

- Настройка GitHub App secrets
- Валидация конфигурации
- Проверка доступа

```bash
./github/add-github-secrets.sh
```

### `test-official-action.sh`

**Тестирование Claude Code Action**

- End-to-end тестирование
- Валидация workflow
- Health checks

```bash
./github/test-official-action.sh
```

### `test-github-models.sh`

**Тестирование GitHub Models**

- Проверка CLI расширения
- Сравнение моделей
- Контекстное тестирование

```bash
./github/test-github-models.sh
```

## 🛠️ Utils - Утилиты

### `quick-commands.sh`

**Быстрые команды для разработки**

- Ежедневные операции
- Shortcuts для общих задач
- Productivity helpers

```bash
./utils/quick-commands.sh [command]

# Доступные команды:
# start, restart, test, status, clean, fix, benchmark
```

### `quick-start-orchestration.sh`

**Быстрый пример оркестрации**

- Демо с 4 агентами
- Создание todo-приложения
- Обучающий пример

```bash
./utils/quick-start-orchestration.sh
```

### `benchmark.js`

**Производительное тестирование**

- Benchmark API endpoints
- Нагрузочное тестирование
- Метрики производительности

```bash
node utils/benchmark.js

# Переменные окружения:
# BENCHMARK_URL=http://localhost:3000
# CONCURRENT_REQUESTS=10
# TOTAL_REQUESTS=100
```

## 🚀 Быстрый старт

### 1. Первая установка

```bash
# Полная установка
./setup/all-in-one-setup.sh

# Запуск локального сервера
./core/cynosure-local.sh start
```

### 2. Демо оркестрации

```bash
# Простой пример
./utils/quick-start-orchestration.sh

# Полный проект
./core/cs-claude-orchestrator.sh demo-project ~/projects/demo
```

### 3. GitHub интеграция

```bash
# Создание GitHub App
./github/auto-create-github-app.sh

# Добавление секретов
./github/add-github-secrets.sh

# Тестирование
./github/test-official-action.sh
```

## 📊 Мониторинг

### Активные процессы

```bash
# tmux сессии
tmux ls | grep cs-

# Статус сервисов
./core/cynosure-local.sh status
```

### Логи и отладка

```bash
# Логи оркестрации
tail -f ../claude-logs/*.error

# Системные логи
./utils/quick-commands.sh status
```

## 🔧 Зависимости

### Обязательные

- **Claude Code CLI** - Основной инструмент
- **tmux** - Управление сессиями
- **jq** - JSON обработка

### Опциональные

- **Node.js** - Для benchmark.js
- **gh CLI** - Для GitHub операций
- **docker** - Для контейнеризации

## 📝 Примечания

- Все скрипты используют относительные пути
- JSON формат для всех выходных данных
- Логирование ошибок в dedicated файлы
- Graceful cleanup при завершении

---
*Обновлено: 27 июня 2025*
