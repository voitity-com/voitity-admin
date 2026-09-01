# voitity-admin

Base de administración en React/Vite con Devias Kit Pro integrado.

- Todo el código de la aplicación vive en `src/` (el proyecto Vite está en `src/` y su código fuente en `src/src`).
- Ejecuta los comandos (`npm install`, `npm run dev`, `npm run build`) desde `src/`.
- Levanta el entorno con `docker-compose up --build` para desarrollo en contenedor (expuesto en http://localhost:3000).
- Los administradores de Bigmelo tienen el módulo `/dashboard/reports` con pestañas de embudo, usuarios, campañas y conversión. La API valida el rol además de ocultar el menú a otros usuarios.
- Después de iniciar una prueba, el flujo redirige a `/dashboard/profiles?create=1` y abre el formulario existente para crear el primer perfil.
