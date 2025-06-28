# 🎯 Claude MAX + GitHub Actions: Руководство

## Проблема

У вас есть Claude MAX подписка ($200/month), но она **не включает API доступ** для автоматизации.

## Решения

### 1. 🆓 Использовать Claude Code локально (Рекомендуется)

Поскольку у вас MAX подписка, вы можете использовать Claude Code из терминала:

```bash
# Установить Claude Code
curl -fsSL https://api.claude.ai/install.sh | sh

# Войти с вашей MAX подпиской
claude login

# Использовать для code review
claude "Review this PR: $(gh pr diff 123)"
```

### 2. 🔄 Альтернативный прокси через Claude Code

Мы можем модифицировать наш прокси для работы через Claude Code CLI:

```javascript
// claude-proxy/src/claudeCodeBridge.js
import { spawn } from 'child_process';

export class ClaudeCodeBridge {
  async executeClaudeCode(prompt) {
    return new Promise((resolve, reject) => {
      const claude = spawn('claude', [prompt], {
        env: { ...process.env, CLAUDE_MODE: 'json' }
      });
      
      let output = '';
      claude.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      claude.on('close', (code) => {
        if (code === 0) {
          resolve(JSON.parse(output));
        } else {
          reject(new Error(`Claude Code exited with code ${code}`));
        }
      });
    });
  }
}
```

### 3. 🤖 GitHub Actions с локальным Claude Code

```yaml
name: Claude MAX Review

on:
  pull_request:
    types: [opened]

jobs:
  review-with-max:
    runs-on: self-hosted  # Требуется self-hosted runner
    steps:
      - name: Setup Claude Code
        run: |
          # Claude Code уже установлен на self-hosted runner
          # и авторизован с MAX подпиской
          
      - name: Review PR with Claude MAX
        run: |
          PR_DIFF=$(gh pr diff ${{ github.event.number }})
          
          claude "Review this PR:\n\n$PR_DIFF" > review.txt
          
          # Post review as comment
          gh pr comment ${{ github.event.number }} --body-file review.txt
```

### 4. 🔑 Получить отдельный API ключ

Если нужна полная автоматизация в облаке:

1. Перейти на https://console.anthropic.com/
2. Создать отдельный API аккаунт 
3. Купить API credits ($5 minimum)
4. Использовать API ключ в GitHub Actions

## 💡 Рекомендации

### Для локальной разработки (у вас есть MAX):
```bash
# Использовать Claude Code напрямую
claude "твой запрос"

# Или через наш модифицированный прокси
cd claude-proxy
npm run dev:max  # Режим для MAX подписки
```

### Для GitHub Actions в облаке:
- **Self-hosted runner**: Можно использовать MAX через Claude Code
- **GitHub-hosted runner**: Нужен отдельный API ключ

## 🛠️ Модификация прокси для MAX

Добавим поддержку Claude Code CLI в наш прокси:

```javascript
// claude-proxy/src/server.js - добавить
app.post('/api/claude-max/messages', async (req, res) => {
  try {
    // Использовать Claude Code CLI вместо API
    const result = await claudeCodeBridge.executeClaudeCode(
      req.body.prompt || req.body.messages[0].content
    );
    
    res.json({
      content: result,
      model: 'claude-max',
      usage: { note: 'Usage tracked by MAX subscription' }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 📊 Сравнение подходов

| Подход | Плюсы | Минусы |
|--------|-------|--------|
| Claude Code локально | ✅ Бесплатно с MAX<br>✅ Полный функционал | ❌ Только локально<br>❌ Не для GitHub cloud runners |
| Self-hosted runner | ✅ Использует MAX<br>✅ Полная автоматизация | ❌ Нужен свой сервер<br>❌ Сложнее настроить |
| Отдельный API ключ | ✅ Работает везде<br>✅ Простая настройка | ❌ Дополнительные расходы<br>❌ Отдельно от MAX |

## 🎯 Итог

С Claude MAX подпиской лучшие варианты:

1. **Для личного использования**: Claude Code в терминале
2. **Для автоматизации**: Self-hosted GitHub runner с Claude Code
3. **Для полной cloud автоматизации**: Купить отдельный API доступ

Ваш MAX план дает много возможностей, но API автоматизация требует дополнительных шагов.