# SGV — Sistema de Gestión de Ventas

## Stack
- **Frontend:** HTML + CSS + JS puro (sin frameworks)
- **Base de datos:** Supabase (PostgreSQL en la nube)
- **Hosting:** Netlify / Vercel (deploy automático desde GitHub)

## Estructura del proyecto

```
sgv/
├── index.html          ← Entrada principal (solo HTML)
├── css/
│   └── styles.css      ← Todos los estilos
├── js/
│   ├── supabase.js     ← Conexión y persistencia en la nube
│   ├── ui.js           ← Helpers: toast, confirm, print, teclado
│   ├── columnas.js     ← Config de columnas (solo RGRDELTA)
│   ├── nav.js          ← Navegación entre páginas
│   ├── articulos.js    ← Módulo Artículos: listado + ABM
│   ├── clientes.js     ← Módulo Clientes: listado + ABM
│   ├── tablas.js       ← Tablas auxiliares: rubros, marcas, etc.
│   └── usuarios.js     ← Usuarios, login y despachos
└── README.md
```

## Usuarios
- **RGRDELTA** — Usuario master (nivel 99). Sin contraseña. Acceso total + herramientas dev.
- Resto de usuarios — Se gestionan desde el módulo Usuarios (nivel > 80).

## Módulos actuales
- Artículos (maestro + filtros + configuración de columnas)
- Clientes (maestro + filtros)
- Tablas: Marcas, Rubros, Proveedores, Vendedores, Cond. de Pago, Categorías, Grupos
- Despachos
- Usuarios

## Próximos módulos
- Compras
- Facturación

## Cómo correr localmente
Necesitás un servidor local (no abre bien como `file://`).

```bash
# Con Python
python3 -m http.server 8000

# Con Node
npx serve .
```

Luego abrís `http://localhost:8000`
