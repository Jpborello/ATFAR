# Documentación Técnica del Sistema - ATFAR

Este documento detalla la estructura, funcionalidades, credenciales y arquitectura del sistema **ATFAR (Asociación de Trabajadores de Farmacias de Rosario)**. Está diseñado para servir como manual de entrega del proyecto y guía de referencia técnica para administradores y futuros desarrolladores.

---

## 1. Stack Tecnológico y Arquitectura

El sistema está desarrollado con tecnologías modernas y optimizadas para rendimiento y escalabilidad:

*   **Frontend (Framework):** [Next.js 16 (App Router)](https://nextjs.org/) con soporte completo de TypeScript.
*   **Biblioteca de UI:** [React 19](https://react.dev/).
*   **Estilos y Maquetación:** [Tailwind CSS v4](https://tailwindcss.com/) y PostCSS para un diseño responsive, moderno y optimizado.
*   **Iconografía:** [Lucide React](https://lucide.dev/) para iconos vectoriales limpios.
*   **Mapas Interactivos:** [Leaflet](https://leafletjs.com/) y `react-leaflet` para geolocalización de farmacias y sedes.
*   **Base de Datos y Autenticación:** [Supabase](https://supabase.com/) (PostgreSQL).
*   **Proveedor de Autenticación y Almacenamiento (Storage):** Supabase Auth & Storage.

---

## 2. Credenciales y Configuración del Entorno

Las variables de entorno requeridas para la conexión con la base de datos y la autenticación se encuentran configuradas en el archivo local [.env.local](file:///.env.local).

### Configuración de Supabase:
*   **URL del Proyecto:** `https://wdmtyxzafrxuibqqxbbv.supabase.co`
*   **Clave Pública Anónima (Anon Key):**
    ```text
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbXR5eHphZnJ4dWlicXF4YmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzEyMzQsImV4cCI6MjA5ODEwNzIzNH0.LYOQsLpQeW_m0FDK7egMlWtuRSTEJXoQXxoGkqJpaFY
    ```
*   **Clave de Rol de Servicio (Service Role Key - Solo Backend/Admin):**
    ```text
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbXR5eHphZnJ4dWlicXF4YmJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjUzMTIzNCwiZXhwIjoyMDk4MTA3MjM0fQ.CE6etgrxPtsWuVcgJO7Ik_UgqCjYPnoMes7cbkCfhxw
    ```

> [!WARNING]
> La clave `SUPABASE_SERVICE_ROLE_KEY` otorga bypass total sobre las políticas de seguridad (RLS). **Nunca** debe ser expuesta en código del lado del cliente. Solo se debe utilizar en funciones de servidor (Server Components, API Routes) protegidas.

---

## 3. Estructura de la Base de Datos (Supabase Schema)

El esquema completo de base de datos PostgreSQL está documentado y estructurado en el archivo [supabase_schema.sql](file:///d:/_PROYECTOS/clientes/Atfar/supabase_schema.sql). Contiene las siguientes tablas, relaciones y mecanismos de seguridad:

### 3.1 Tablas principales

1.  **`public.profiles`**: Extiende la tabla de usuarios del sistema de autenticación (`auth.users`).
    *   `id`: UUID (Primary Key, referencia a `auth.users`).
    *   `email`: TEXT (Correo del usuario).
    *   `full_name`: TEXT (Nombre completo).
    *   `role`: `user_role` (Enum: `'admin'`, `'pharmacy_owner'`, `'employee'`).
    *   `phone`: TEXT (Teléfono).
    *   `seen_tutorial`: BOOLEAN (Estado de visualización del tutorial inicial).
    *   `created_at`: TIMESTAMP (Fecha de creación).

2.  **`public.pharmacies`**: Registro detallado de las farmacias registradas en el sistema.
    *   `id`: UUID (Primary Key).
    *   `name` / `nombre_fantasia`: TEXT (Nombre comercial).
    *   `razon_social`: TEXT (Razón social fiscal).
    *   `cuit`: TEXT (CUIT único de la farmacia).
    *   `address` / `declared_addresses`: TEXT (Direcciones comerciales y sucursales).
    *   `latitude` / `longitude`: FLOAT8 (Coordenadas para el mapa interactivo).
    *   `whatsapp` / `phone_alt`: TEXT (Contactos de mensería).
    *   `registered`: BOOLEAN (Estado de registro y validación).
    *   `owner_id`: UUID (Referencia a `public.profiles`).
    *   `has_debt`: BOOLEAN (Indicador de deuda activa para DDJJ o aportes).
    *   `resp_email` / `resp_phone` / `resp_alt_email`: Contactos del responsable de la farmacia.
    *   `hr_email` / `hr_phone` / `hr_alt_email` / `hr_name` / `hr_role`: Contactos del área de Recursos Humanos.

3.  **`public.employees`**: Nómina de empleados asignados a cada farmacia adherida.
    *   `id`: UUID (Primary Key).
    *   `pharmacy_id`: UUID (Referencia a `public.pharmacies`).
    *   `full_name`: TEXT (Nombre completo del empleado).
    *   `cuil`: TEXT (CUIL del empleado, único).
    *   `category`: TEXT (Categoría profesional del CCT inicial).
    *   `entry_date`: DATE (Fecha de ingreso a la farmacia).
    *   `weekly_hours`: INTEGER (Horas semanales de trabajo, por defecto 44).
    *   `active`: BOOLEAN (Estado del empleado en la farmacia).
    *   `is_affiliate`: BOOLEAN (Indica si el empleado está afiliado directamente a ATFAR).

4.  **`public.payments`**: Historial y control de cuentas corrientes y aportes de farmacias.
    *   `id`: UUID (Primary Key).
    *   `pharmacy_id`: UUID (Referencia a `public.pharmacies`).
    *   `invoice_number`: TEXT (Número de boleta o factura de aportes).
    *   `period`: TEXT (Período liquidado, ej: "2026-06").
    *   `amount`: NUMERIC(12,2) (Monto a pagar).
    *   `status`: TEXT (Estados: `'pagado'`, `'impago'`, `'en_revision'`).
    *   `due_date`: DATE (Fecha de vencimiento).
    *   `pay_date`: DATE (Fecha de pago efectivo).
    *   `transaction_code`: TEXT (Código de transacción de transferencia/Mercado Pago).
    *   `receipt_url`: TEXT (Enlace al PDF o comprobante de pago subido).

5.  **`public.benefit_requests`**: Solicitudes de beneficios sindicales por parte de afiliados (ej: kit escolar).
    *   `id`: UUID (Primary Key).
    *   `employee_id`: UUID (Referencia al perfil del empleado en `public.profiles`).
    *   `benefit_type`: TEXT (Tipo de beneficio solicitado).
    *   `status`: TEXT (Estados: `'pending'`, `'approved'`, `'rejected'`).
    *   `attachment_url`: TEXT (Documentación adjunta de respaldo).
    *   `metadata`: JSONB (Detalles extras de la solicitud).

6.  **`public.job_applications`**: Base de postulantes de la Bolsa de Trabajo.
    *   `id`: UUID (Primary Key).
    *   `full_name`: TEXT (Nombre del postulante).
    *   `email` / `phone`: TEXT (Datos de contacto directo).
    *   `position`: TEXT (Puesto o categoría a la que aplica).
    *   `message`: TEXT (Presentación corta).
    *   `cv_url`: TEXT (URL pública del archivo PDF almacenado en Supabase Storage).

7.  **`public.announcements`**: Circulares, comunicados y noticias del gremio.
    *   `title` / `summary` / `content`: Contenido de la circular.
    *   `category`: TEXT (Categorías: `'Gremiales'`, `'Beneficios'`, `'Capacitación'`, `'Institucional'`).
    *   `visibility`: TEXT (Privacidad: `'public'` para la web general o `'pharmacy'` exclusivo para propietarios).
    *   `image_url`: TEXT (Imagen de cabecera de la noticia).

8.  **`public.salary_scales`** & **`public.salary_scales_docs`**: Escalas salariales vigentes.
    *   Almacenan categorías profesionales, sueldo básico, sumas no remunerativas y documentos adjuntos oficiales (PDFs de homologaciones).

### 3.2 Seguridad de la Base de Datos (Row Level Security - RLS)

Todas las tablas cuentan con **Row Level Security (RLS)** activado para asegurar que los usuarios accedan únicamente a los datos autorizados para su rol:

*   **Perfiles (`profiles`)**: Lectura pública; edición limitada a los propios datos del usuario (`auth.uid() = id`).
*   **Farmacias (`pharmacies`)**: Lectura pública (para el mapa); creación y edición permitida únicamente al propietario asignado (`owner_id = auth.uid()`) o a administradores.
*   **Empleados (`employees`)**: Los propietarios de farmacias solo pueden ver y gestionar los empleados vinculados a su propia farmacia (`pharmacies.owner_id = auth.uid()`). Los administradores poseen control total.
*   **Pagos (`payments`)**: Los propietarios solo pueden consultar y actualizar sus propios estados de cuenta; los administradores tienen control total sobre todos los estados de cuenta de la red.
*   **Bolsa de Trabajo (`job_applications`)**: Inserción pública (cualquier persona puede subir su CV si provee los campos de contacto y URL requeridos); la visualización de los CVs está reservada exclusivamente para administradores y propietarios de farmacias autorizados.

### 3.3 Triggers y Funciones Automáticas

Se implementó un Trigger que se ejecuta automáticamente cuando se registra un nuevo usuario en la base de datos de autenticación de Supabase (`auth.users`):

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role public.user_role := 'employee'::public.user_role;
  assigned_role public.user_role;
  raw_role_text text;
BEGIN
  raw_role_text := new.raw_user_meta_data->>'role';
  
  -- Seguridad: Se evita que un usuario auto-asigne el rol 'admin' desde el registro público
  IF raw_role_text = 'pharmacy_owner' THEN
    assigned_role := 'pharmacy_owner'::public.user_role;
  ELSE
    assigned_role := default_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    assigned_role,
    new.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 3.4 Almacenamiento (Storage Buckets)

Supabase Storage cuenta con dos contenedores (Buckets) públicos creados para gestionar archivos:

1.  **`cvs`**: Guarda los currículums de los postulantes de la bolsa de trabajo en formato PDF.
    *   *Políticas:* Inserción libre desde el formulario web; consulta protegida para roles autorizados.
2.  **`receipts`**: Almacena los comprobantes digitales de transferencias o boletas cargadas por las farmacias.
    *   *Políticas:* Inserción limitada a usuarios autenticados; lectura general y verificación de administradores.

---

## 4. Lógica de Negocio y Reglas Gremiales (CCT)

El sistema implementa reglas de cálculo específicas para el Convenio Colectivo de Trabajo de Farmacias aplicables en la provincia de Santa Fe (Rosario):

### 4.1 Ascenso Automático de Categorías por Antigüedad
De acuerdo al código implementado en [src/lib/dateUtils.ts](file:///d:/_PROYECTOS/clientes/Atfar/src/lib/dateUtils.ts), los empleados son promovidos automáticamente de categoría en función de sus años de antigüedad acumulados. 
*   **Regla:** Por cada **5 años** de antigüedad cumplidos, el empleado sube una categoría en el escalafón del CCT.
*   **Orden de Categorías (de menor a mayor jerarquía):**
    1.  Cadetes
    2.  Aprendiz Ayudante
    3.  Personal Auxiliar Interno y Externo
    4.  Personal con Asignación Específica
    5.  Ayudante en Gestión de Farmacia
    6.  Personal en Gestión de Farmacia
    7.  Farmacéutico

### 4.2 Cálculos de Declaración Jurada (DDJJ)
En el panel de la farmacia (`/farmacia/declaraciones`), al generar una presentación mensual:
*   Se lee la nómina activa de empleados de la farmacia.
*   Se calcula la antigüedad exacta de cada empleado.
*   Se obtiene la categoría actual correspondiente (aplicando los saltos de 5 años si corresponden).
*   Se asocian los montos básicos y adicionales de acuerdo a la escala salarial guardada en base de datos.
*   Se aplican porcentajes diferenciales si el empleado está catalogado como **Afiliado** (cuota sindical) vs **No Afiliado** (solo aportes de ley).

---

## 5. Funcionalidades Detalladas por Rol de Usuario

El sistema se adapta visual y funcionalmente según el rol asignado al usuario autenticado:

### 5.1 Portal Público (Visitante General / Postulante)
*   **Inicio (`/`)**: Presenta noticias generales, comunicados públicos e incorpora un mapa interactivo (usando Leaflet) que renderiza la ubicación exacta de las farmacias adheridas a ATFAR en la región de Rosario.
*   **Bolsa de Trabajo (`/bolsa`)**: Permite a cualquier persona cargar sus datos de contacto, seleccionar la categoría profesional a la que aspira, escribir un mensaje breve y subir su CV en formato PDF (límite de 5MB).
*   **Escalas Salariales (`/escalas`)**: Vista pública de las escalas históricas y vigentes firmadas por el gremio, permitiendo descargar los archivos PDF de actas acuerdo homologadas.
*   **Contacto e Institucional (`/contacto`, `/institucional`)**: Formularios de consulta directa, mapa de sedes del gremio y detalles institucionales sobre comisiones y beneficios generales de los afiliados.

### 5.2 Panel del Propietario de Farmacia (`/farmacia`)
*   **Inicio y Métricas**: Dashboard resumen con la cantidad de empleados activos, estado de la cuenta corriente (Al Día / Con Deuda) y últimas circulares internas emitidas por la administración.
*   **Gestión de Perfil de Farmacia**: Formulario completo para mantener actualizados los datos de Razón Social, CUIT, WhatsApp, Domicilios Declarados, Responsable Técnico y datos de contacto de Recursos Humanos.
*   **Gestión de Empleados**: Permite agregar nuevos empleados declarando su Nombre, CUIL, Categoría Base de contratación, Fecha de ingreso, Horas semanales y si está afiliado al sindicato.
*   **Declaraciones Juradas (DDJJ) mensual**: Herramienta interactiva para declarar la nómina mes a mes. Realiza los cálculos automatizados y genera la boleta de aportes correspondiente.
*   **Gestión de Pagos**: Historial de períodos liquidados, montos de boletas generadas y pasarela para registrar el pago. Permite adjuntar el comprobante físico (PDF/Imagen) y tipear el código de transacción para que sea revisado por la administración.
*   **Búsqueda en la Bolsa de Trabajo**: Acceso a la base de postulantes que subieron su currículum en la web pública, permitiendo filtrar por categoría profesional (ej: Cadete, Farmacéutico) y descargar el PDF del CV.

### 5.3 Panel del Administrador (`/admin`)
*   **Control de Farmacias**: Vista global de toda la red de farmacias. Permite registrar nuevas entidades, editar detalles y marcar deudas o regularizaciones directamente.
*   **Control de Pagos**: Bandeja de entrada con los pagos cargados por las farmacias en estado "En revisión". El administrador analiza el comprobante subido por el propietario y puede aprobar o rechazar la transacción para actualizar el estado del período a "Pagado".
*   **Gestión de Escalas Salariales**: Panel para dar de alta nuevos acuerdos del CCT, editar los salarios básicos por categoría y subir los documentos oficiales del gremio (PDFs).
*   **Bolsa de Empleo (Administración)**: Monitoreo total de los currículums cargados por los postulantes.
*   **Circulares y Noticias**: Panel de administración para redactar noticias públicas o circulares internas orientadas a farmacéuticos o empleados.

### 5.4 Panel del Empleado Afiliado (`/empleado`)
*   Dashboard personal para consultar datos del perfil, descargar carnet digital de afiliado si corresponde, ver los beneficios disponibles (kits de estudio, subsidios) y enviar solicitudes directas con documentación digital adjunta.

---

## 6. Mapa de Rutas del Código (Ruteo Next.js)

Estructura organizada de los componentes y páginas clave del código fuente en el directorio `src/`:

```text
src/
├── app/
│   ├── (public)/                 # Vistas públicas generales
│   │   ├── bolsa/                # Bolsa de trabajo (formulario de carga de CV)
│   │   ├── contacto/             # Contacto e información comercial de sedes
│   │   ├── escalas/              # Consulta pública de escalas salariales
│   │   ├── institucional/        # Información del gremio e historia
│   │   ├── noticias/             # Circulares y noticias públicas
│   │   ├── utiles/               # Documentos y descargas generales
│   │   ├── layout.tsx            # Navegación del sitio público
│   │   └── page.tsx              # Landing page principal y buscador de farmacias
│   ├── admin/                    # Panel de administración ATFAR
│   │   ├── empleo/               # Control de postulantes y CVs cargados
│   │   ├── escalas/              # Gestión de CCT y escalas salariales
│   │   ├── farmacias/            # Lista de farmacias y accesos a detalle
│   │   │   └── [id]/             # Detalle y cuenta de una farmacia particular
│   │   ├── reportes/             # Generador de reportes financieros y nómina
│   │   ├── layout.tsx            # Sidebar de navegación del panel administrador
│   │   └── page.tsx              # Dashboard con métricas globales
│   ├── empleado/                 # Panel para empleados y afiliados
│   │   └── page.tsx              # Trámite de beneficios y visualización de perfil
│   ├── farmacia/                 # Panel exclusivo para propietarios de farmacia
│   │   ├── acuerdos/             # Visualización y descarga de actas de CCT
│   │   ├── declaraciones/        # Generador mensual de DDJJ de nómina de empleados
│   │   ├── pagos/                # Cuenta corriente de aportes, pago y carga de tickets
│   │   ├── postulantes/          # Buscador de CVs y perfiles de candidatos
│   │   └── page.tsx              # Dashboard del propietario y nómina declarada
│   ├── login/                    # Pantalla de inicio de sesión única
│   ├── favicon.ico
│   ├── globals.css               # Estilos globales y tokens CSS
│   └── layout.tsx                # Proveedor de raíz del sistema
├── components/
│   ├── map/                      # Componentes integrados con Leaflet
│   │   ├── ContactMap.tsx        # Renderizado de mapa de contacto de oficinas
│   │   └── PharmacyMap.tsx       # Buscador geolocalizado de farmacias adheridas
│   └── shared/                   # Componentes comunes del Layout
│       ├── Footer.tsx
│       └── Navbar.tsx
└── lib/
    ├── dateUtils.ts              # Utilidades de cálculo de antigüedad y escalas
    └── supabase.ts               # Inicialización del cliente Supabase SSR
```

---

## 7. Instrucciones para la Puesta en Marcha (Instalación y Despliegue)

### 7.1 Requisitos Previos
*   [Node.js](https://nodejs.org/) v20 o superior.
*   Gestor de paquetes `npm` (incluido con Node.js).
*   Una cuenta en [Supabase](https://supabase.com/).

### 7.2 Pasos de Instalación
1.  **Clonar el repositorio** e ingresar a la carpeta del proyecto.
2.  **Instalar dependencias del proyecto:**
    ```bash
    npm install
    ```
3.  **Configurar variables de entorno:**
    Asegurarse de que exista el archivo `.env.local` en la raíz del proyecto con la estructura detallada en la sección 2.
4.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    El sitio estará disponible localmente en `http://localhost:3000`.

### 7.3 Configuración de la Base de Datos (Supabase)
Si se desea recrear la base de datos en un nuevo proyecto de Supabase:
1.  Ir a la consola de Supabase -> **SQL Editor**.
2.  Crear una nueva consulta y pegar todo el contenido de [supabase_schema.sql](file:///d:/_PROYECTOS/clientes/Atfar/supabase_schema.sql).
3.  Hacer clic en **Run** para crear todas las tablas, tipos enums, políticas de seguridad RLS, triggers y buckets de almacenamiento requeridos.
4.  Asegurarse de habilitar el registro público y actualizar las variables de entorno en el archivo `.env.local` con las nuevas URLs y claves generadas en el nuevo proyecto.

### 7.4 Compilación para Producción
Para compilar y validar la aplicación antes del despliegue final:
```bash
npm run build
```
Esto generará la compilación optimizada en la carpeta `.next/`, lista para ser desplegada en proveedores como Vercel, Netlify o servidores VPS autogestionados.
