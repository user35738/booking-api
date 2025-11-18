# Booking API

API для бронирования мест на мероприятие.

## Что внутри
- Express + Node.js
- PostgreSQL
- Миграция SQL
- Docker + docker-compose
- Тесты (Jest + Supertest)

## Как запустить (локально через Docker)

1. Скопируйте `.env.example` в `.env` и при необходимости скорректируйте.

```bash
cp .env.example .env
```

2. Запустите контейнеры:

```bash
docker-compose up --build -d
```

3. Примените миграцию (в контейнере или локально):

```bash
# из хоста
docker exec -i booking-api_db psql -U postgres -d booking -f /docker-entrypoint-initdb.d/init.sql
```

(скрипт `docker-compose` уже монтирует `migrations/init.sql` в контейнер, поэтому при первом запуске миграция выполнится автоматически)

4. API будет доступно на `http://localhost:3000`.

## Endpoints

### POST /api/bookings/reserve

Request body:
```json
{
  "event_id": 1,
  "user_id": "user123"
}
```

Responses:
- `201` `{ "success": true }` — успешно
- `400` / `422` — ошибка валидации / бизнес-правило

## Тесты

```bash
# поставить зависимости
npm ci

# запустить тесты (предполагается, что PostgreSQL доступен по DATABASE_URL)
npm test
```

## Примечания
- В базе есть уникальный индекс `(event_id, user_id)` — защита от дубликатов.
- Транзакция и `SELECT ... FOR UPDATE` используются для предотвращения race conditions.
