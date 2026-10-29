# TutorGO

Plataforma web tipo *marketplace* educativo que conecta a **estudiantes** con **tutores**: el estudiante busca tutores por categoría, calificación y cercanía, agenda clases y las reseña; el tutor publica ofertas, define su disponibilidad y atiende solicitudes; el administrador aprueba tutores, modera la comunidad y consulta analíticas.

## Entregables y enlaces

| Entregable / recurso | Dirección o ubicación |
|---|---|
| Sitio publicado (frontend, Netlify) | https://9490-20-2571-proyectofinaldw.netlify.app/ |
| API publicada (backend, Render) | https://tutorgo-api-vqwv.onrender.com/ |
| Comprobación de la API | https://tutorgo-api-vqwv.onrender.com/api/salud |
| Repositorio | https://github.com/ErickGonzalezUMG/ProyectoDW2026 |
| Código fuente | Repositorio: [`backend/`](backend) (API) y [`frontend/`](frontend) (aplicación web) |
| Manual técnico (PDF) | [`documentacion/Manual_Tecnico_TutorGO.pdf`](documentacion/Manual_Tecnico_TutorGO.pdf) |
| Manual de usuario (PDF) | [`documentacion/Manual_Usuario_TutorGO.pdf`](documentacion/Manual_Usuario_TutorGO.pdf) |

> Si la API estuvo inactiva, la primera petición puede tardar unos segundos en responder mientras el servicio se reactiva.

## Datos del estudiante

| Campo | Dato |
|---|---|
| Nombre | Erick Enrique González Canel |
| Carné | 9490-20-2571 |
| Curso | Desarrollo Web, semestre 8 |
| Universidad | Universidad Mariano Gálvez de Guatemala, sede El Naranjo |
| Modalidad | Proyecto final individual |

## Tecnologías

**Frontend:** React 19, TypeScript, Vite, React-Bootstrap, SCSS, React Router, FullCalendar (calendario), Leaflet (mapas), Recharts (gráficas), `@react-oauth/google`.

**Backend:** Node.js, Express 5, TypeScript, Mongoose (MongoDB Atlas), JSON Web Tokens, `google-auth-library`.

**Despliegue:** Netlify (frontend), Render (backend) y MongoDB Atlas (base de datos).

## Funcionalidades

### Para todos los usuarios
- Inicio de sesión con **Google** y sesión protegida con **JWT** (la sesión expira y se cierra sola).
- Registro inicial (*onboarding*) según el rol: estudiante o tutor.
- **Calendario** con las clases del usuario, vista de detalle y estado de cada clase (pendiente, aprobada, rechazada, cancelada y realizada).
- Página de **políticas** de la comunidad.

### Estudiante
- **Búsqueda de tutores** por categoría, calificación mínima y cercanía, con mapa y distancia.
- **Agendar clases** sobre la disponibilidad real del tutor, con aviso cuando el horario no está disponible.
- **Reseñas** de 1 a 5 estrellas en clases ya realizadas.
- Compartir un tutor por **WhatsApp**.
- **Denunciar** a un tutor por una clase ya realizada.

### Tutor
- **Ofertas** por categoría, con modalidad (virtual, casa del tutor o casa del estudiante) y tarifa por hora y por kilómetro.
- **Disponibilidad** semanal.
- Aprobar o rechazar solicitudes de clase y cancelar clases.

### Administrador
- Gestión de **categorías** (con categorías padre) y aprobación de **tutores**.
- **Moderación:** bandeja de denuncias (suspender con motivo o descartar), bandeja de apelaciones (aceptar para reactivar o rechazar) y lista de usuarios con suspensión y reactivación directa.
- **Analíticas:** ranking de tutores, horas de clase por categoría, clases por estado y tarjetas resumen.

### Suspensión y apelación
Un usuario suspendido puede iniciar sesión, pero solo ve la pantalla **Suspendido**: el motivo, la fecha, el enlace a las políticas y un formulario para apelar. El administrador decide la apelación.

## Estructura del proyecto

```
ProyectoDW2026/
├── backend/
│   └── src/
│       ├── config/        Conexión a MongoDB
│       ├── middleware/    validarToken, soloAdmin, permitirRoles
│       ├── models/        Esquemas de Mongoose (10 modelos)
│       ├── routes/        Rutas de la API (auth, usuarios, ofertas, tutorias, ...)
│       ├── utils/         Cálculo de agenda y distancias
│       └── index.ts       Servidor Express
└── frontend/
    └── src/
        ├── components/    Componentes reutilizables
        ├── context/       AuthContext (sesión y peticiones protegidas)
        ├── pages/         Páginas de la aplicación
        ├── styles/        main.scss
        ├── types/         Tipos de TypeScript
        └── main.tsx       Punto de entrada
```

## Ejecución en local

Requisitos: Node.js 20 o superior, una base de datos MongoDB (por ejemplo, un clúster gratuito de MongoDB Atlas) y un ID de cliente de Google OAuth.

### 1. Backend

```bash
cd backend
npm install
```

Copia `.env.example` a `.env` y completa estas variables:

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto del servidor (3001 por defecto) |
| `MONGO_URI` | Cadena de conexión a MongoDB |
| `JWT_SECRET` | Secreto para firmar los tokens |
| `JWT_EXPIRES_IN` | Duración del token (por ejemplo, `1h`) |
| `GOOGLE_CLIENT_ID` | ID de cliente de Google OAuth |

```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
```

Copia `.env.example` a `.env` y completa:

| Variable | Para qué sirve |
|---|---|
| `VITE_API_URL` | Dirección del backend, sin barra final (por ejemplo, `http://localhost:3001`) |
| `VITE_GOOGLE_CLIENT_ID` | El mismo ID de cliente de Google |

```bash
npm run dev
```

La aplicación queda en `http://localhost:5173`. En Google Cloud, agrega ese origen a los **orígenes JavaScript autorizados** del ID de cliente.

> Los archivos `.env` contienen secretos y no se suben al repositorio.

## Despliegue

**Backend (Render):**
- Comando de compilación: `npm install --include=dev && npm run build`
- Comando de inicio: `npm start`
- Variables de entorno: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN` y `GOOGLE_CLIENT_ID`.

**Frontend (Netlify):**
- Variables de entorno: `VITE_API_URL` (sin barra final) y `VITE_GOOGLE_CLIENT_ID`. Si se cambian, hay que volver a desplegar.
- El archivo `public/_redirects` redirige todas las rutas a `index.html` para que React Router funcione al recargar.

Cada `git push` a la rama `main` vuelve a desplegar ambos servicios automáticamente.

## Documentación adicional

- **Manual técnico** ([PDF](documentacion/Manual_Tecnico_TutorGO.pdf)): esquema y descripción de componentes, uso de TypeScript y SCSS, y diagrama entidad-relación.
- **Manual de usuario** ([PDF](documentacion/Manual_Usuario_TutorGO.pdf)): guía paso a paso por rol, con capturas de pantalla.
