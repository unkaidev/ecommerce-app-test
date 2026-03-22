# ============================================================
# ShopNext — Makefile
# Usage: make <target>
# ============================================================

.PHONY: help up down build logs migrate seed ps clean

COMPOSE = docker compose -f docker-compose.yml --env-file .env

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

up: ## Start all services
	$(COMPOSE) up -d

down: ## Stop and remove containers
	$(COMPOSE) down

build: ## Rebuild all images
	$(COMPOSE) build --no-cache

logs: ## Tail logs (all services)
	$(COMPOSE) logs -f

logs-api: ## Tail API logs
	$(COMPOSE) logs -f api

logs-web: ## Tail web logs
	$(COMPOSE) logs -f web

migrate: ## Run TypeORM migrations inside api container
	$(COMPOSE) exec api npx typeorm migration:run -d dist/config/typeorm.config.js

seed: ## Run database seed inside api container
	$(COMPOSE) exec postgres psql -U shopnext -d shopnext -f /docker-entrypoint-initdb.d/seed.sql

ps: ## Show container status
	$(COMPOSE) ps

clean: ## Remove containers, volumes, and images
	$(COMPOSE) down -v --rmi local
