# Connections++

## Wymagania

- [Docker](https://docs.docker.com/get-docker/) z **Docker Compose** (plugin `docker compose`).

## Uruchomienie całej aplikacji (Docker)

1. W katalogu głównym repozytorium utwórz plik **`ai-service/.env`** (np. skopiuj `ai-service/.env.example`). Compose wymaga tego pliku przy starcie `ai-service`.
2. Uruchom:

```bash
docker compose up --build
```

W tle (detached):

```bash
docker compose up --build -d
```

3. Pierwszy start: obrazy się zbudują, **Postgres** musi przejść healthcheck, potem wstanie **backend**, na końcu **frontend**.

## Adresy (domyślne porty)

| Usługa    | URL |
|-----------|-----|
| Frontend | http://localhost:3000 |
| Backend (API) | http://localhost:3001 |
| Swagger (OpenAPI UI) | http://localhost:3001/docs |
| AI service (FastAPI) | http://localhost:8000 |
| PostgreSQL | `localhost:5432` (użytkownik / baza: `connections`, hasło jak w `docker-compose.yml`) |

## Zatrzymanie

```bash
docker compose down
```

Usunięcie kontenerów **oraz** wolumenu z danymi Postgresa:

```bash
docker compose down -v
```

Logi (np. backend):

```bash
docker compose logs -f backend
```
