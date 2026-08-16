# Altar_Dashboard
# Desarrollo local con Firebase Emulator Suite

El SGSA solo usa los emuladores cuando se cumplen ambas condiciones: se sirve
desde `localhost`, `127.0.0.1` o `::1`, y la URL contiene `?emulator=1`.
Sin ese parámetro, incluso en desarrollo local, el comportamiento sigue usando
Firebase Cloud. En Vercel no se activan emuladores aunque se añada el parámetro.

1. Inicia los emuladores:

   ```powershell
   firebase emulators:start --only auth,firestore
   ```

2. En otra terminal, crea el usuario administrativo local:

   ```powershell
   cd scripts/formation-rules-tests
   node seed-local-admin.js
   ```

   Por defecto usa `admin.local@example.test` y `local-admin-password`. Puedes
   sustituirlos con `LOCAL_ADMIN_EMAIL` y `LOCAL_ADMIN_PASSWORD`.

3. Sirve el directorio del proyecto de forma estática y abre, por ejemplo:

   ```text
   http://127.0.0.1:5500/?emulator=1
   ```

   Inicia sesión con email y contraseña. El usuario y su perfil viven solo en
   los emuladores locales. Para volver a Firebase Cloud, elimina
   `?emulator=1` de la URL.
