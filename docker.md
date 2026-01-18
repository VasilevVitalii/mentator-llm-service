# Техническое задание: Docker-контейнер для Mentator LLM Service

## Цель
Создать универсальный Docker-контейнер, который автоматически определяет доступное оборудование (NVIDIA GPU / AMD GPU / CPU) и использует наилучший вариант для запуска LLM-моделей.

## Приоритет выбора железа
```
NVIDIA GPU (CUDA) → AMD GPU (ROCm) → CPU
```

## Требования

### 1. Структура файлов в контейнере
```
/opt/mentator-llm-service/
  ├── default-models/                   # Дефолтные модели (в образе, read-only)
  │   └── qwen2.5-0.5b-instruct-q8_0.gguf
  └── data/                             # Volume для монтирования (read-write)
      ├── mentator-llm-service.conf.jsonc  # Конфигурация пользователя
      ├── mentator-llm-service.db          # SQLite база данных
      └── models/                          # Модели пользователя
          └── *.gguf
```

**Монтируется**: `/opt/mentator-llm-service/data`

**Пути в конфигурации** (автоматически устанавливаются при запуске с `--conf-docker`):
- `port`: 19777 (фиксированно)
- `dbFile`: `/opt/mentator-llm-service/data/mentator-llm-service.db` (фиксированно)
- `modelDir`: `/opt/mentator-llm-service/data/models` (фиксированно)

### 2. Поддержка GPU
- **NVIDIA GPU**: поддержка CUDA (будет протестировано)
- **AMD GPU**: поддержка ROCm (реализация на основе документации, без реального тестирования)
- **CPU**: fallback режим без GPU (будет протестировано)
- Автоматическое определение доступного железа при запуске контейнера
- Не требуется ручная настройка со стороны пользователя

### 3. node-llama-cpp
- Должны быть установлены все необходимые зависимости для работы node-llama-cpp
- Поддержка работы с CUDA, ROCm и CPU в одной сборке
- **Гибридный подход**: использовать prebuild бинарники где возможно, компиляцию где необходимо
  - Сначала попытаться использовать официальные prebuild версии
  - Если prebuild не поддерживают нужную функциональность — компилировать вручную
  - Приоритет: скорость сборки при сохранении универсальности

### 4. Точка запуска
- Приложение: `distjs/index.js` (скомпилированный из `src/index.ts`)
- Режим запуска: `--conf-docker /opt/mentator-llm-service/data/mentator-llm-service.conf.jsonc`
- Автоматическое создание конфига при первом запуске (если файла нет)
- Фиксированные пути (port, dbFile, modelDir) устанавливаются программно
- Entrypoint скрипт для автоопределения железа и установки переменных окружения

### 5. Тестовая модель
- Тестовая модель `qwen2.5-0.5b-instruct-q8_0.gguf` включается в Docker-образ
- Модель хранится в образе в `/opt/mentator-llm-service/default-models/`
- При первом запуске entrypoint скрипт копирует дефолтные модели в `/opt/mentator-llm-service/data/models/` (если там пусто)
- Пользователь может заменить/добавить свои модели в volume
- При обновлении образа можно получить новые дефолтные модели

### 6. Build-скрипт
- Написать скрипт на JavaScript для сборки контейнера
- Расположение: `.auto/build-docker.js`
- Добавить команду в `package.json` для запуска скрипта
- **Функционал скрипта:**
  - Проверка наличия Docker и его запуск
  - Копирование тестовой модели из `/home/vitalii/GGUF/qwen2.5-0.5b-instruct-q8_0.gguf` в контекст сборки
  - Сборка Docker-образа с тегами (latest, version из package.json)
  - Отображение итогового размера образа
  - Опционально: публикация в Docker Hub (через флаг или переменную окружения)

## Архитектурные решения

### Multi-stage build
Использовать multi-stage Dockerfile:

**Stage 1: Builder**
- Base image: node:20
- Установка build-инструментов (cmake, g++, python3)
- Установка CUDA toolkit (для компиляции)
- Установка ROCm SDK (для компиляции)
- Установка npm зависимостей
- Компиляция node-llama-cpp с поддержкой CUDA и ROCm
- Сборка TypeScript проекта (`npm run buildjs`)

**Stage 2: Runtime**
- Base image: node:20-slim
- Установка только runtime библиотек:
  - CUDA runtime (без toolkit)
  - ROCm runtime (без SDK)
- Копирование из builder:
  - `distjs/` — собранное приложение
  - `node_modules/` — зависимости (включая скомпилированный node-llama-cpp)
  - `package.json`
- Копирование entrypoint скрипта
- Healthcheck для мониторинга состояния сервиса

### Entrypoint скрипт
Создать `docker-entrypoint.sh`, который:
1. Копирует дефолтные модели из `/opt/mentator-llm-service/default-models/` в `/opt/mentator-llm-service/data/models/` если папка пустая
2. Проверяет наличие NVIDIA GPU (`nvidia-smi`)
3. Если нет — проверяет AMD GPU (`rocm-smi` или `/dev/kfd`, `/dev/dri`)
4. Устанавливает переменные окружения для llama.cpp:
   - `LLAMA_CUDA=1` для NVIDIA
   - `LLAMA_HIPBLAS=1` для AMD
   - Ничего для CPU
5. Выводит в лог информацию о выбранном режиме
6. Запускает `node distjs/index.js --conf-docker /opt/mentator-llm-service/data/mentator-llm-service.conf.jsonc`

### Healthcheck
Добавить в Dockerfile проверку работоспособности сервиса:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:19777/state/version || exit 1
```
- Проверяет доступность API каждые 30 секунд
- Используется эндпоинт `/state/version` (легковесный запрос)
- Дает 60 секунд на старт (загрузка моделей может занять время)
- После 3 неудачных проверок контейнер считается нездоровым

### Пример запуска контейнера

```bash
# NVIDIA GPU
docker run --gpus=all \
  -v /path/to/data:/opt/mentator-llm-service/data \
  -p 19777:19777 \
  mentator-llm-service

# AMD GPU
docker run \
  --device /dev/kfd \
  --device /dev/dri \
  -v /path/to/data:/opt/mentator-llm-service/data \
  -p 19777:19777 \
  mentator-llm-service

# CPU only
docker run \
  -v /path/to/data:/opt/mentator-llm-service/data \
  -p 19777:19777 \
  mentator-llm-service
```

## Открытые вопросы

### ❓ Вопрос 2: Одновременная поддержка CUDA и ROCm
**Проблема**: Может ли llama.cpp быть собран с одновременной поддержкой CUDA и ROCm, или нужны отдельные сборки?

**Нужно исследовать**:
- Документацию llama.cpp на предмет возможности multi-backend сборки
- CMake флаги для включения обоих backend'ов
- Поведение llama.cpp при runtime выборе backend'а

**Гипотеза**: llama.cpp может быть собран с несколькими backend'ами и выбирает нужный автоматически.

**Решение**: _[TODO - требуется исследование]_

---

## План реализации

### Этап 1: Исследование
- [ ] Изучить документацию node-llama-cpp по компиляции с CUDA/ROCm
- [ ] Изучить llama.cpp CMake опции для multi-backend сборки
- [ ] Проверить размеры CUDA runtime и ROCm runtime в Docker
- [ ] Ответить на открытые вопросы 1, 2, 3

### Этап 2: Прототип Dockerfile
- [ ] Создать базовый Dockerfile с multi-stage build
- [ ] Реализовать builder stage с компиляцией node-llama-cpp
- [ ] Реализовать runtime stage с минимальными зависимостями
- [ ] Добавить healthcheck
- [ ] Протестировать сборку образа

### Этап 3: Entrypoint и автоопределение
- [ ] Написать `docker-entrypoint.sh` с логикой определения GPU
- [ ] Реализовать установку переменных окружения для llama.cpp
- [ ] Добавить информативное логирование о выбранном режиме
- [ ] Протестировать на CPU и NVIDIA GPU

### Этап 4: Build-скрипт
- [ ] Создать `.auto/build-docker.js`
- [ ] Реализовать функционал сборки образа
- [ ] Добавить команду в `package.json`
- [ ] Документировать использование скрипта

### Этап 5: Конфигурация и volume
- [ ] Реализовать генерацию дефолтного конфига при первом запуске
- [ ] Настроить монтирование volume
- [ ] Проверить работу с внешней моделью из `/data/gguf/`

### Этап 6: Документация
- [ ] Обновить README.md с инструкциями по Docker
- [ ] Создать примеры docker-compose.yml
- [ ] Добавить troubleshooting секцию для Docker

### Этап 7: Тестирование
- [ ] CPU режим
- [ ] NVIDIA GPU режим
- [ ] AMD GPU режим - только проверка сборки и наличия ROCm библиотек (реальное тестирование невозможно)
- [ ] Проверка автопереключения между NVIDIA и CPU режимами

### Этап 8: Оптимизация
- [ ] Оптимизация размера образа
- [ ] Кэширование слоев для ускорения пересборки
- [ ] Документация по настройке производительности

## Примерный размер работы
- **Исследование**: 4-6 часов
- **Разработка Dockerfile**: 6-8 часов
- **Entrypoint и автоматизация**: 3-4 часа
- **Build-скрипт**: 2-3 часа
- **Документация**: 2-3 часа
- **Тестирование и отладка**: 4-6 часов
- **Итого**: ~20-30 часов работы

## Следующие шаги
1. Обсудить и ответить на открытые вопросы
2. Утвердить архитектурные решения
3. Начать этап исследования
4. Приступить к реализации
