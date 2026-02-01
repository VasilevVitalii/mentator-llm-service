<div id="badges">
  <a href="https://www.linkedin.com/in/vasilev-vitalii/">
    <img src="https://img.shields.io/badge/LinkedIn-blue?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn Badge"/>
  </a>
  <a href="https://www.youtube.com/@user-gj9vk5ln5c/featured">
    <img src="https://img.shields.io/badge/YouTube-red?style=for-the-badge&logo=youtube&logoColor=white" alt="Youtube Badge"/>
  </a>
</div>

[English](README.md)

# Mentator LLM Service

Специализированный локальный сервис LLM, который **гарантирует ответы в формате JSON** с использованием генерации на основе грамматики (GBNF). Построен на базе [llama.cpp](https://github.com/ggerganov/llama.cpp) через [node-llama-cpp](https://github.com/withcatai/node-llama-cpp), что позволяет извлекать структурированные данные из неструктурированного текста с типобезопасными, валидированными по схеме результатами.

## Ключевые возможности

- **Гарантированное соответствие JSON Schema** - ответы всегда соответствуют вашей схеме благодаря GBNF (Grammar-Based Neural Format)
- **Локальный инференс** - полная приватность и контроль над данными, никаких внешних API-вызовов
- **Поддержка GGUF моделей** - использование квантованных моделей для эффективной работы на потребительском железе
- **Простой REST API** - легкая интеграция с любым языком программирования или инструментом
- **Веб-интерфейс** - интерактивный чат для тестирования и экспериментов
- **Очередь запросов** - автоматическая обработка конкурентных запросов для предотвращения перегрузки GPU/CPU
- **Гибкая конфигурация** - настраиваемые параметры модели, логирование и настройки базы данных

## Зачем использовать Mentator?

Традиционные LLM часто выдают результаты в непостоянном формате, требуя сложной пост-обработки и обработки ошибок. Mentator решает эту проблему:

1. **Применяя структуру во время генерации** - модель не может выдать невалидный JSON
2. **Валидируя по вашей схеме** - выходы всегда соответствуют вашим определенным TypeScript/JSON Schema типам
3. **Исключая ошибки парсинга** - не нужны блоки try-catch вокруг JSON.parse()
4. **Предоставляя предсказуемые API** - идеально для автоматизации, извлечения данных и структурированных AI-агентов

## Быстрый старт с Docker

Самый быстрый способ начать работу - использовать готовый Docker-образ.

**Важно:** Замените `/path/to/your/data` на реальный путь к вашей директории перед запуском команды.

### Режим GPU (только NVIDIA)

Требуется установленный [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

```bash
docker run --rm --gpus=all \
  -v /path/to/your/data:/opt/mentator-llm-service/data \
  -p 19777:19777 \
  vasilevvitalii/mentator-llm-service:latest
```

### Режим CPU

```bash
docker run --rm \
  -v /path/to/your/data:/opt/mentator-llm-service/data \
  -p 19777:19777 \
  vasilevvitalii/mentator-llm-service:latest
```

Контейнер включает небольшую модель по умолчанию и автоматически создаст конфигурационные файлы при первом запуске в указанной директории данных. Веб-интерфейс будет доступен по адресу http://localhost:19777

Для сборки из исходников и расширенной конфигурации Docker см. раздел [Поддержка Docker](#поддержка-docker) ниже.

## Содержание

- [Быстрый старт с Docker](#быстрый-старт-с-docker)
- [Установка](#установка)
- [Быстрый старт](#быстрый-старт)
- [Конфигурация](#конфигурация)
- [Примеры использования](#примеры-использования)
- [Справочник API](#справочник-api)
- [Веб-интерфейс](#веб-интерфейс)
- [Сборка из исходников](#сборка-из-исходников)
- [Поддержка Docker](#поддержка-docker)
- [Лицензия](#лицензия)

## Установка

### Требования

- [Node.js](https://nodejs.org/) v20.0.0 или выше
- Как минимум один GGUF файл модели (см. [Загрузка моделей](#загрузка-моделей))
- Минимум 8GB RAM (рекомендуется 16GB+ для больших моделей)

### Установка зависимостей

```bash
git clone https://github.com/VasilevVitalii/mentator-llm-service.git
cd mentator-llm-service
npm install
```

### Загрузка моделей

Вам необходимо загрузить GGUF файлы моделей вручную. Рекомендуем начать с:

**[Qwen2.5-Coder-7B-Instruct-Q5_K_M.gguf](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q5_k_m.gguf)** (~5GB)

Другие отличные варианты:
- [Llama 3.2 модели](https://huggingface.co/models?library=gguf&search=llama-3.2) - отличные универсальные модели
- [Mistral модели](https://huggingface.co/models?library=gguf&search=mistral) - эффективные и точные
- Все модели: [Hugging Face GGUF модели](https://huggingface.co/models?library=gguf)

Разместите загруженные `.gguf` файлы в выбранной директории (вы укажете её в конфиге).

## Быстрый старт

### 1. Генерация шаблона конфигурации

```bash
# Сначала соберите проект
npm run buildjs

# Сгенерируйте шаблон конфигурации
node distjs/index.js --conf-gen /путь/к/директории/конфигурации
```

Это создаст `mentator-llm-service.config.TEMPLATE.jsonc` со всеми доступными опциями и документацией.

### 2. Редактирование конфигурации

Переименуйте файл шаблона и настройте его:

```bash
mv mentator-llm-service.config.TEMPLATE.jsonc mentator-llm-service.config.jsonc
```

Минимально необходимые изменения:
```jsonc
{
  "port": 19777,
  "modelDir": "/путь/к/вашим/gguf/моделям",  // ← Обновите это
  "dbFile": "/путь/к/mentator-llm-service.db",  // ← Обновите это
  "defaultOptions": {
    "temperature": 0.0,
    "maxTokens": 4096
    // ... другие параметры генерации
  },
  "log": {
    "level": "debug",
    "liveDay": 30,
    "savePrompt": false
  }
}
```

### 3. Запуск сервиса

```bash
node distjs/index.js --conf-use /путь/к/mentator-llm-service.config.jsonc
```

Сервис запустится на настроенном порту (по умолчанию: `http://localhost:19777`).

### 4. Тест через веб-интерфейс

Откройте браузер и перейдите к:
- **Главная страница**: `http://localhost:19777/` - обзор и ссылки
- **Чат интерфейс**: `http://localhost:19777/chat` - интерактивное тестирование
- **API документация**: `http://localhost:19777/doc` - Swagger/OpenAPI документация
- **Статистика**: `http://localhost:19777/stat` - загруженные модели и метрики

## Конфигурация

Конфигурационный файл (формат JSONC) поддерживает комментарии и имеет следующую структуру:

### Порт
```jsonc
"port": 19777  // Порт, на котором будет слушать сервер
```

### Директория моделей
```jsonc
"modelDir": "/путь/к/моделям"  // Директория с .gguf файлами
```

Сервис автоматически обнаруживает все `.gguf` файлы в этой директории.

### Файл базы данных
```jsonc
"dbFile": "/путь/к/mentator-llm-service.db"  // База данных SQLite для логов
```

### Параметры генерации по умолчанию
```jsonc
"defaultOptions": {
  "temperature": 0.0,      // Случайность (0.0 = детерминированный, 1.0 = креативный)
  "topP": 0.1,             // Порог nucleus sampling
  "topK": 10,              // Лимит Top-K sampling
  "minP": 0.0,             // Минимальный порог вероятности
  "maxTokens": 4096,       // Максимальная длина ответа в токенах
  "repeatPenalty": 1.0     // Штраф за повторяющиеся токены
}
```

Эти значения по умолчанию объединяются с параметрами каждого запроса.

### Конфигурация логирования
```jsonc
"log": {
  "level": "debug",        // "error" | "debug" | "trace"
  "liveDay": 30,           // Дни хранения логов в базе данных
  "savePrompt": false      // Сохранять полный текст запросов/ответов
}
```

⚠️ **Предупреждение**: Установка `savePrompt: true` сохраняет полные промпты и ответы в базе данных, что может привести к очень большому размеру БД.

## Примеры использования

### Пример 1: Извлечение структурированных данных (веб-интерфейс)

1. Перейдите на `http://localhost:19777/chat`
2. Выберите модель из выпадающего списка
3. Введите эту историю в поле "User Prompt":

```
Я - Боб, мне 9 лет и я живу на улице Солнечной. Напротив меня живет моя подруга Диана,
ей 8 лет и она занимается гимнастикой. Чуть дальше живет мой друг Джон, он на год старше
меня. Мы любим играть с ним в теннис. Судить нашу игру мы просим мистера Смита. Он бывший
теннисный судья. И хотя ему уже 92 года, он все еще любит свою бывшую работу и с
удовольствием помогает нам.
```

4. Добавьте в начало: `Перечисли людей из текста (имя, возраст и т.д.):`
5. Нажмите кнопку "FORMAT", включите "use grammar" и вставьте эту схему:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "age": { "type": "integer" },
      "sex": { "type": "string", "enum": ["male", "female"] },
      "hobby": { "type": "string" }
    },
    "required": ["name", "age", "sex"]
  }
}
```

6. Закройте модальное окно (кнопка OK)
7. Нажмите "OPTIONS" → "SET EXAMPLE FOR JSON" → OK
8. Нажмите "Send"

**Результат**: Гарантированно валидный JSON-массив людей с их деталями!

### Пример 2: API запрос (cURL)

```bash
curl -X POST http://127.0.0.1:19777/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder-7b-instruct-q5_k_m",
    "message": {
      "user": "Перечисли людей из текста (имя, возраст и т.д.): Я - Боб, мне 9 лет и я живу на улице Солнечной. Напротив меня живет моя подруга Диана, ей 8 лет и она занимается гимнастикой. Чуть дальше живет мой друг Джон, он на год старше меня. Мы любим играть с ним в теннис. Судить нашу игру мы просим мистера Смита. Он бывший теннисный судья. И хотя ему уже 92 года, он все еще любит свою бывшую работу и с удовольствием помогает нам."
    },
    "durationMsec": 30000,
    "format": {
      "useGrammar": true,
      "jsonSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "age": { "type": "integer" },
            "sex": { "type": "string", "enum": ["male", "female"] },
            "hobby": { "type": "string" }
          },
          "required": ["name", "age", "sex"]
        }
      }
    }
  }'
```

**Ответ**:
```json
{
  "duration": {
    "promptMsec": 5234,
    "queueMsec": 0
  },
  "result": {
    "loadModelStatus": "exists",
    "data": [
      {"name": "Боб", "age": 9, "sex": "male", "hobby": "теннис"},
      {"name": "Диана", "age": 8, "sex": "female", "hobby": "гимнастика"},
      {"name": "Джон", "age": 10, "sex": "male", "hobby": "теннис"},
      {"name": "мистер Смит", "age": 92, "sex": "male", "hobby": "теннисный судья"}
    ]
  }
}
```

### Пример 3: TypeScript/JavaScript клиент

```typescript
async function extractPeople(text: string) {
  const response = await fetch('http://127.0.0.1:19777/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5-coder-7b-instruct-q5_k_m',
      message: {
        user: `Перечисли людей из текста (имя, возраст и т.д.): ${text}`
      },
      durationMsec: 30000,
      format: {
        useGrammar: true,
        jsonSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'integer' },
              sex: { type: 'string', enum: ['male', 'female'] },
              hobby: { type: 'string' }
            },
            required: ['name', 'age', 'sex']
          }
        }
      }
    })
  });

  const result = await response.json();
  return result.result.data;  // Типизированный массив людей
}
```

## Справочник API

### Основные эндпоинты

#### `POST /prompt`
Обработка промпта и возврат структурированного JSON-ответа.

**Тело запроса**:
```typescript
{
  model: string;              // Имя модели (имя файла с .gguf)
  message: {
    system?: string;          // Опциональный системный промпт
    user: string;             // Пользовательский промпт
  };
  durationMsec: number;       // Таймаут в миллисекундах
  options?: {                 // Опциональные параметры генерации
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
    // ... см. конфиг для всех опций
  };
  format?: {                  // Опциональное JSON-форматирование
    useGrammar: boolean;      // Использовать GBNF для генерации с грамматикой
    jsonSchema: object;       // JSON Schema для валидации/генерации
  };
}
```

**Ответ** (200 OK):
```typescript
{
  duration: {
    promptMsec: number;        // Время обработки
    queueMsec: number;        // Время ожидания в очереди
  };
  result: {
    loadModelStatus: "load" | "exists";  // Статус загрузки модели
    data: any;                // Структурированный ответ, соответствующий вашей схеме
  };
}
```

**Ответ** (400/500 ошибка):
```typescript
{
  duration: {
    promptMsec: number;
    queueMsec: number;
  };
  error: string;              // Описание ошибки
}
```

### Эндпоинты валидации

#### `POST /check/gbnf`
Валидация синтаксиса GBNF грамматики.

#### `POST /check/jsonresponse`
Валидация структуры JSON Schema.

#### `POST /check/options`
Валидация и дополнение параметров генерации.

### Информационные эндпоинты

#### `GET /state`
Получить текущее состояние сервиса (загруженные модели, статус очереди).

#### `GET /state/models`
Список всех доступных моделей в директории моделей.

#### `GET /state/version`
Получить версию сервиса.

### Эндпоинты логов

#### `GET /log/core/bydate`
Получить основные логи по диапазону дат.

#### `GET /log/chat/bydate`
Получить логи чата/промптов по диапазону дат.

Полная документация API доступна по адресу `http://localhost:19777/doc` (Swagger UI).

## Веб-интерфейс

Сервис предоставляет несколько веб-страниц:

- **/** - Главная страница с обзором сервиса и примерами
- **/chat** - Интерактивный чат-интерфейс для тестирования промптов
- **/doc** - Swagger/OpenAPI API документация
- **/stat** - Панель статистики с загруженными моделями и метриками
- **/log/core** - Логи основных операций сервиса
- **/log/chat** - Логи запросов/ответов для промптов

## Сборка из исходников

### Сборка JavaScript

```bash
npm run buildjs
```

Результат в директории `distjs/` может быть запущен с Node.js:

```bash
node distjs/index.js --conf-use /путь/к/config.jsonc
```

## Поддержка Docker

Для инструкций по установке и использованию Docker, см. [docker.md](docker.md).

## Решение проблем

### Модель не загружается
- Убедитесь, что `.gguf` файл находится в настроенной `modelDir`
- Проверьте права доступа к файлу (сервису нужен доступ на чтение)
- Убедитесь, что у вас достаточно RAM (минимум 8GB, рекомендуется 16GB+)

### Медленные ответы
- Используйте более квантованные модели (Q4_K_M или Q5_K_M)
- Уменьшите `maxTokens` в параметрах генерации
- Проверьте использование CPU/GPU во время инференса

### Ошибки JSON Schema
- Протестируйте вашу схему по адресу `http://localhost:19777/doc` используя `/check/jsonresponse`
- Убедитесь, что схема валидна согласно [спецификации JSON Schema](https://json-schema.org/)
- Сложные схемы могут снизить скорость генерации

### Нехватка памяти
- Используйте более квантованные модели (Q2, Q3, Q4 вместо Q5, Q6, Q8)
- Уменьшите `maxTokens`
- Закройте другие приложения

## Советы по производительности

1. **Выбирайте правильную квантизацию**: Q5_K_M предлагает лучший баланс качества и размера
2. **Используйте temperature 0.0** для детерминированных выводов
3. **Устанавливайте подходящий maxTokens** - не генерируйте больше, чем нужно
4. **Мониторьте время в очереди** - высокое время очереди указывает на необходимость более мощного железа или меньших моделей
5. **Включайте логирование выборочно** - `savePrompt: false` держит размер базы данных под контролем

## Внесение вклада

Вклад приветствуется! Не стесняйтесь создавать issues или pull requests.

## Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

## Автор

Виталий Васильевич
- LinkedIn: [vasilev-vitalii](https://www.linkedin.com/in/vasilev-vitalii/)
- YouTube: [@user-gj9vk5ln5c](https://www.youtube.com/@user-gj9vk5ln5c/featured)

## Связанные проекты

- [node-llama-cpp](https://github.com/withcatai/node-llama-cpp) - Node.js биндинги для llama.cpp
- [llama.cpp](https://github.com/ggerganov/llama.cpp) - LLM инференс на C++
- [vv-ai-prompt-format](https://www.npmjs.com/package/vv-ai-prompt-format) - Утилиты для форматирования промптов
