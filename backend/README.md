# Taski Backend

A Django-based backend for a Trello-like task management system.

## Project Structure

```
backend/
├── taski_backend/          # Main Django project
│   ├── __init__.py
│   ├── asgi.py            # ASGI configuration for Channels
│   ├── settings.py        # Django settings
│   ├── urls.py            # Main URL configuration
│   └── wsgi.py            # WSGI configuration
├── boards/                # Boards app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── consumers.py       # WebSocket consumers
│   ├── models.py          # Database models
│   ├── routing.py         # WebSocket routing
│   ├── serializers.py     # DRF serializers
│   ├── urls.py            # App URL configuration
│   └── views.py           # API views
├── manage.py              # Django management script
└── requirements.txt       # Python dependencies
```

## Setup Instructions

1. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run migrations:
   ```bash
   python manage.py migrate
   ```

4. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

5. Start Redis server (required for WebSocket support):
   ```bash
   redis-server
   ```

6. Run the development server:
   ```bash
   python manage.py runserver
   ```

## API Endpoints

- REST API: `http://localhost:8000/api/`
- WebSocket: `ws://localhost:8000/ws/board/{board_id}/`
- Admin Interface: `http://localhost:8000/admin/`
- API Documentation: `http://localhost:8000/swagger/`

## Features

- Board, List, and Card management
- Real-time updates using WebSockets
- User authentication and authorization
- RESTful API with Django REST Framework
- Swagger/OpenAPI documentation 