# Board Vault

## Frontend

Angular client, using tailwindcss for styling.

### Project Structure

In general, the project structure is divided into the following folders:

```txt
src/
├── app/
│   ├── api/                   # External API calls to backend
│   │
│   ├── components/            # Reusable components (used +1 times)
│   │
│   ├── layout/                # Layout components (used just once)
│   │
│   ├── pages/                 # Components that represent a page, only accessible through routing
│   │
│   ├── core/
│   │   ├── guards/            # Guards for routing
│   │   ├── interceptors/      # Interceptors for HTTP requests
│   │   ├── services/          # Services for state management
│   │   └── validators/        # Custom Validators for forms
```

#### Layout
