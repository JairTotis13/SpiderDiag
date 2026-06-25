# SpiderDiag — Plataforma Profesional de Diagnóstico Automotriz

Plataforma web para talleres mecánicos y especialistas en diagnóstico automotriz. Conecta un adaptador OBD-II al vehículo y visualiza, almacena y analiza información de diagnóstico en tiempo real.

## Stack

| Capa | Tecnologías |
|---|---|
| **Backend** | FastAPI, SQLAlchemy (async), MySQL/MariaDB, WebSockets, JWT, Alembic, Pydantic v2, python-OBD |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Zustand, React Query, Recharts, pnpm |
| **Infra** | Docker, Docker Compose, Nginx |

## Arranque rápido

```bash
git clone <repo>
cd SpiderDiag
cp .env.example .env
# Editar .env con tus valores

# Con Docker:
docker compose up -d --build

# Sin Docker:
# Terminal 1 — Backend
cd backend
python -m venv venv
source venv/bin/activate.fish  # fish
pip install -r requirements.txt
cp ../.env .env && sed -i 's/MYSQL_HOST=db/MYSQL_HOST=localhost/' .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend
pnpm install
pnpm run dev
```

Abrir `http://localhost:5173` · Login: `admin@spiderdiag.com` / `Admin123!`

## Requisitos (CachyOS / Arch Linux)

```bash
sudo pacman -S docker docker-compose git base-devel python python-pip pnpm mariadb
sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
sudo systemctl start mariadb
sudo mariadb -e "CREATE DATABASE IF NOT EXISTS spiderdiag; CREATE USER IF NOT EXISTS 'spiderdiag'@'localhost' IDENTIFIED BY 'SpiderDiag2024!'; GRANT ALL PRIVILEGES ON spiderdiag.* TO 'spiderdiag'@'localhost'; FLUSH PRIVILEGES;"
```

## Conexión OBD-II

1. Conectar adaptador ELM327 al USB
2. Verificar puerto: `ls /dev/ttyUSB*`
3. Configurar `OBD_PORT` en `backend/.env`
4. En la app: sección **OBD-II** → seleccionar cliente y vehículo → **Conectar**

Bluetooth:
```bash
sudo bluetoothctl
scan on
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
exit
sudo rfcomm bind 0 XX:XX:XX:XX:XX:XX
# Puerto: /dev/rfcomm0
```

## API Endpoints

### Auth
| Método | Ruta | Rol |
|---|---|---|
| POST | `/api/v1/auth/login` | Público |
| POST | `/api/v1/auth/register` | Público |
| GET | `/api/v1/auth/me` | Autenticado |
| GET | `/api/v1/auth/roles` | Autenticado |

### Clientes y Vehículos
| Método | Ruta |
|---|---|
| GET/POST | `/api/v1/clients` |
| GET/PUT/DELETE | `/api/v1/clients/{id}` |
| GET/POST | `/api/v1/vehicles` |
| GET/PUT/DELETE | `/api/v1/vehicles/{id}` |

### OBD-II
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/obd/status` | Estado conexión |
| POST | `/api/v1/obd/connect` | Conectar |
| POST | `/api/v1/obd/disconnect` | Desconectar |
| POST | `/api/v1/obd/read-dtc` | Leer DTC |
| POST | `/api/v1/obd/clear-dtc` | Borrar DTC |
| GET | `/api/v1/obd/latest-reading` | Última lectura |
| WS | `/api/v1/obd/ws/{diag_id}` | Tiempo real |

### Dashboard y Reportes
| Método | Ruta |
|---|---|
| GET | `/api/v1/dashboard/summary` |
| GET | `/api/v1/dashboard/live/{id}` |
| GET/POST | `/api/v1/alerts` |
| POST | `/api/v1/alerts/{id}/read` |
| POST | `/api/v1/reports/generate` |
| GET | `/api/v1/reports/{id}/download` |

Swagger: `http://localhost:8000/docs`

## Estructura

```
SpiderDiag/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # Endpoints REST
│   │   ├── core/           # Config, DB, JWT
│   │   ├── models/         # Tablas SQLAlchemy (9 modelos)
│   │   ├── schemas/        # Pydantic DTOs
│   │   ├── repositories/   # Patrón Repository
│   │   ├── services/       # Lógica de negocio + OBD + PDF
│   │   ├── websocket/      # Manager tiempo real
│   │   └── main.py
│   ├── alembic/            # Migraciones
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, Sidebar, StatCard
│   │   ├── pages/          # 12 páginas
│   │   ├── hooks/          # WebSocket hook
│   │   ├── store/          # Zustand (auth, theme)
│   │   ├── services/       # Axios API client
│   │   └── types/          # TypeScript interfaces
│   ├── Dockerfile
│   └── package.json
├── nginx/nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

## Base de Datos

```
roles ──< users ──< diagnostics ──< dtc_codes
                     │              ├── live_data
                     │              ├── alerts
                     │              └── reports
                     │
clients ──< vehicles ──< diagnostics
```

- 10 tablas con índices, FK e integridad referencial
- Seed inicial: roles (3) + admin (admin@spiderdiag.com / Admin123!)

## Módulos

| # | Módulo | Estado |
|---|---|---|
| 1 | Autenticación (JWT + roles) | Listo |
| 2 | Gestión de Clientes | Listo |
| 3 | Gestión de Vehículos | Listo |
| 4 | Diagnóstico OBD-II + WebSocket | Listo |
| 5 | Códigos DTC (leer/borrar) | Listo |
| 6 | Dashboard tiempo real + gráficas | Listo |
| 7 | Historial de diagnósticos | Listo |
| 8 | Reportes PDF | Listo |
| 9 | Alertas inteligentes | Listo |
| 10 | IA Automotriz | Preparado |

## Arquitectura

```
React ──HTTP──> Nginx ──proxy──> FastAPI ──> MySQL/MariaDB
   │                                    │
   └──── WebSocket (tiempo real) ───────┘
                                            │
                                    python-OBD ──> ELM327 ──> ECU
```

- **Clean Architecture**: API → Service → Repository → Model
- **Async SQLAlchemy**: operaciones no bloqueantes con MySQL
- **JWT** con refresh tokens y roles (Administrador, Técnico, Supervisor)
- **WebSocket** para broadcast de lecturas OBD en tiempo real

## Futuro: Módulo IA

Arquitectura preparada para integrar modelos de IA:

```python
# backend/app/services/ai.py (a implementar)
class AIDiagnosticService:
    async def analyze_dtc(self, codes: list, vehicle_data: dict) -> dict: ...
    async def predict_failures(self, live_data: list) -> list: ...
    async def recommend_tests(self, symptoms: list) -> list: ...
```

---

**SpiderDiag** — Desarrollado para talleres mecánicos profesionales.
