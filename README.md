# Fuel App Backend

## Project Description
Fuel App Backend is a RESTful API designed to manage fueling operations, track fuel consumption, and provide analytics for users and fleet operators.

## Features
- User authentication and authorization
- Manage fuel transactions
- Track fuel consumption
- Generate reports and analytics
- API integration with third-party services

## Tech Stack
- **Language**: Python
- **Framework**: Django REST Framework
- **Database**: PostgreSQL
- **Deployment**: Docker, AWS

## Installation Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/espeescobar/fuel-app-backend.git
   ```
2. Navigate to the project directory:
   ```bash
   cd fuel-app-backend
   ```
3. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
4. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the server:
   ```bash
   python manage.py runserver
   ```

## Usage Guide
- Navigate to `http://localhost:8000/api` to access the API endpoints.
- Use Postman or any API testing tool for testing.

## Project Structure
```
/fuel-app-backend
│
├── manage.py
├── fuel_app
│   ├── migrations
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   └── urls.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

## API Endpoints
| Endpoint             | Method | Description                    |
|----------------------|--------|--------------------------------|
| `/api/users/`       | GET    | List all users                 |
| `/api/users/{id}/`  | GET    | Retrieve a user by ID          |
| `/api/fuels/`       | POST   | Create a new fuel transaction   |
| `/api/fuels/{id}/`  | GET    | Retrieve a fuel transaction by ID|
| `/api/reports/`     | GET    | Get fuel consumption reports    |

## Contribution Guidelines
1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/YourFeature
   ```
3. Make your changes and commit:
   ```bash
   git commit -m "Add your feature description"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/YourFeature
   ```
5. Open a pull request.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) for more details.
