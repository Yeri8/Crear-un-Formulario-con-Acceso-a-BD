Proyecto: formulario_bd

Estructura incluida:
- frontend/index.html, frontend/styles.css
- backend/sqlite/server-sqlite.js, backend/sqlite/package.json
- backend/mongo/server-mongo.js, backend/mongo/package.json (opcional)

Instrucciones (SQLite, recomendado para pruebas locales sin instalar MongoDB):
1) Abrir terminal en backend/sqlite
   cd backend/sqlite
   npm install
   npm start
2) Abrir en el navegador: http://localhost:3000

Instrucciones (MongoDB):
- Si tienes MongoDB en tu máquina o Docker, puedes usar backend/mongo
  cd backend/mongo
  npm install
  export MONGO_URI='mongodb://localhost:27017/formulario_bd'   (Windows: set MONGO_URI=...)
  npm start

Notas:
- El backend SQLite crea un archivo data.sqlite dentro de backend/sqlite.
- El frontend envía requests a /api/people que sirve el mismo servidor backend.
