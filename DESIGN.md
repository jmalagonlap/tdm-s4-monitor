---
name: TDM S4 Monitor
description: Dashboard ejecutivo de comparativa GPS Syrus4G vs Mix FM — ÁRTIMO Telematics
colors:
  primary: "#E10B17"
  primary-deep: "#BC1818"
  ink: "#1A1A1A"
  ink-secondary: "#5A5A59"
  ink-muted: "#8A8A89"
  surface: "#FFFFFF"
  surface-raised: "#F5F6F8"
  surface-subtle: "#F2F2F2"
  divider: "#E0E0E0"
  syrus: "#2E7D32"
  mixfm: "#1976D2"
  diferencia: "#F57C00"
  success: "#4CAF50"
  warning: "#FFC107"
  error: "#F44336"
typography:
  display:
    fontFamily: "'Open Sans', Arial, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
  headline:
    fontFamily: "'Open Sans', Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "'Open Sans', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.04em"
    textTransform: "uppercase"
  body:
    fontFamily: "'Open Sans', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 300
    lineHeight: 1.55
  label:
    fontFamily: "'Open Sans', Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.10em"
    textTransform: "uppercase"
  mono:
    fontFamily: "'Courier New', monospace"
    fontSize: "22px"
    fontWeight: 700
rounded:
  sm: "4px"
  md: "6px"
  pill: "20px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "13px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
  input-default:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "11px 11px 11px 36px"
  stat-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "24px"
  badge-active:
    backgroundColor: "#E8F5E9"
    textColor: "{colors.syrus}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  badge-inactive:
    backgroundColor: "#FFEBEE"
    textColor: "{colors.error}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: TDM S4 Monitor

## 1. Overview

**Creative North Star: "El Tablero Directivo"**

Este sistema visual se comporta como el tablero de sala de directivos: toda la información está presente, ordenada por importancia, sin adorno que compita con el dato. El rojo ÁRTIMO (`#E10B17`) es la firma institucional — aparece en los bordes de acento superiores de los cards, en la línea que separa los encabezados de sección, en el botón primario. Es la única señal de identidad fuerte; el resto del sistema se contiene para que los colores semánticos (verde Syrus, azul Mix FM, naranja diferencia) puedan hablar con claridad.

El espacio en blanco es intencional y disciplinado. Las secciones respiran. El dato más importante — la comparativa Syrus4G vs Mix FM — es legible en tres segundos sin scroll. Las tablas detalladas y el historial son secundarios: están presentes pero no compiten con la lectura rápida.

Lo que este sistema rechaza explícitamente: plantillas Bootstrap con tablas azul marino y botones redondeados genéricos; dashboards oscuros estilo terminal que son incompatibles con presentación a cliente corporativo; la estética SaaS de Silicon Valley con fondos cream/beige, Inter, y cards con border-radius de 24px+; apps de consumo con gradientes de texto y paletas multicolor.

**Key Characteristics:**
- Un solo acento cromático (rojo ÁRTIMO) — el resto son neutrales y colores semánticos
- Sombras estructurales: presentes y legibles, no decorativas
- Espaciado ejecutivo: secciones respiran, información jerarquizada visualmente
- Tipografía funcional: Open Sans en tres pesos, sin fuentes adicionales
- Identidad a través del borde rojo superior — no mediante gradientes ni glassmorphism

## 2. Colors: La Paleta Institucional

Dos capas: la identidad ÁRTIMO (rojo + neutrales) y los colores semánticos del dato (verde/azul/naranja). Las dos capas no se mezclan — la identidad ancla, el dato comunica.

### Primary
- **Rojo Institucional** (`#E10B17`): El color de identidad ÁRTIMO. Botón primario de login, borde superior de stat cards, línea divisora de encabezados de sección, foco de inputs, estado activo del sistema. No se usa como fondo de superficie grande.
- **Rojo Profundo** (`#BC1818`): Variante oscura. Título principal del header, estado hover del botón primario. Refuerza la identidad sin duplicar la señal de acción.

### Secondary (colores semánticos del dato)
- **Verde Syrus4G** (`#2E7D32`): Exclusivo para datos de Syrus4G. Columna Syrus, borde superior del primer stat card, badge activo, dataset de la gráfica.
- **Azul Mix FM** (`#1976D2`): Exclusivo para datos de Mix FM. Columna Mix FM, borde superior del segundo stat card, dataset de la gráfica.
- **Naranja Diferencia** (`#F57C00`): Tercer stat card (diferencia diaria), columna de diferencia en tablas. Solo para el dato diferencial — nunca como color de UI genérico.

### Tertiary (estados del sistema)
- **Verde Éxito** (`#4CAF50`): Badge "Activo", estado "activo" del texto de estado.
- **Amarillo Advertencia** (`#FFC107`): Badge "Pendiente".
- **Rojo Error** (`#F44336`): Badge "Error" en vehículos.

### Neutral
- **Tinta Principal** (`#1A1A1A`): Texto de cuerpo, contenido de tablas, valores de datos.
- **Tinta Secundaria** (`#5A5A59`): Subtítulos, labels de stat cards, texto de encabezados de tabla.
- **Tinta Silenciada** (`#8A8A89`): Placeholders, texto de pie de página, subtextos.
- **Superficie** (`#FFFFFF`): Fondo del dashboard, fondo de cards y tablas.
- **Superficie Elevada** (`#F5F6F8`): Fondo del login, fondo de inputs.
- **Superficie Sutil** (`#F2F2F2`): Fondo de encabezados de tabla, filas hover, área de status.
- **Divisor** (`#E0E0E0`): Bordes de celdas, separadores entre filas.

### Named Rules
**La Regla del Color Único.** El rojo ÁRTIMO aparece en máximo tres roles simultáneos en cualquier pantalla: borde superior de card, línea de sección, y el estado del sistema. Si aparece en más contextos, pierde su función de anclaje identitario.

**La Regla del Semántico Exclusivo.** Verde, azul y naranja son propiedad de los datos. No se usan para estados de UI genéricos, decoración, o elementos que no sean Syrus4G, Mix FM, o Diferencia respectivamente.

## 3. Typography

**Body/UI Font:** Open Sans (300 Light, 600 SemiBold, 700 Bold) — único en el sistema.

**Mono Font:** Courier New — solo para el reloj de última actualización. No para código ni datos tabulares.

**Character:** Sobrio y funcional. Open Sans en tres pesos crea toda la jerarquía necesaria sin una segunda familia. El contraste weight es suficiente: 300 para contenido, 700 para números de dato y etiquetas de sección. Sin display exótico, sin script decorativo — el tablero no necesita personalidad tipográfica propia.

### Hierarchy
- **Display** (700, 40px, line-height 1): Números de stat cards — el dato más prominente de la pantalla.
- **Headline** (700, 24px, line-height 1.2): Título principal en el header. Una sola instancia en la pantalla.
- **Title** (700, 15px, uppercase, letter-spacing 0.04em): Encabezados de sección. Siempre en mayúsculas con la línea roja debajo. Máximo 4 palabras.
- **Body** (300, 13px, line-height 1.55): Contenido de tablas, subtítulos de stat cards, texto general.
- **Label** (700, 11px, uppercase, letter-spacing 0.10em): Encabezados de tabla (th), badges de estado, etiquetas de campos de login.
- **Mono** (700, 22px, Courier New): Tiempo de última actualización — único uso del monoespaciado.

### Named Rules
**La Regla del Peso Único por Nivel.** Cada nivel tipográfico tiene un peso fijo. No se combina 700 con italic, ni 300 con uppercase. Mezclar pesos y casos en un mismo nivel destruye la jerarquía.

## 4. Elevation

El sistema usa sombras estructurales: presentes y legibles, no decorativas ni ambientales. Cada superficie tiene un rol en la jerarquía de elevación. La sombra comunica estructura, no estética.

### Shadow Vocabulary
- **Ambient** (`0 2px 12px rgba(0,0,0,0.08)`): Cards en reposo (stat cards, tabla, gráfica). Separa el card del fondo sin dominarlo.
- **Structural** (`0 4px 16px rgba(0,0,0,0.12)`): Header. Ancla la barra superior como superficie dominante de la jerarquía.
- **Elevated** (`0 8px 24px rgba(0,0,0,0.12)`): Cards en hover. Señal clara de interactividad.
- **Inset** (`0 0 0 3px rgba(225,11,23,0.08)`): Focus ring de inputs. No es sombra sino contorno de foco.

### Named Rules
**La Regla del Par Único.** Nunca `border: 1px solid` + `box-shadow` grande (blur ≥ 16px) en el mismo elemento. Un solo mecanismo de separación por superficie: o borde o sombra.

**La Regla del Estado-Responsive.** Las sombras elevated solo aparecen en hover — nunca en reposo. El reposo es calm; el hover es feedback.

## 5. Components

### Buttons
- **Shape:** Gently squared (4px radius — `{rounded.sm}`)
- **Primary (Login/CTA):** Fondo rojo ÁRTIMO `#E10B17`, texto blanco, padding `13px 24px`, texto uppercase 11px/700/letter-spacing 0.18em. Hover: `opacity: 0.88`. Active: `transform: scale(0.97)`.
- **Secondary (Dashboard actions):** Fondo `#F2F2F2`, borde `1px solid #DDD`, texto `#1A1A1A`. Hover: transición a fondo rojo y texto blanco en `200ms ease-out`. Active: `transform: scale(0.97)`.
- **Transition:** `background-color 200ms ease-out, color 200ms ease-out, border-color 200ms ease-out, transform 160ms ease-out`. Nunca `transition: all`.

### Stat Cards
- **Shape:** `6px` radius (`{rounded.md}`)
- **Accent:** Borde superior `3px solid [color semántico]` — no borde lateral. El acento superior es sutil y no rompe el flujo de lectura horizontal.
- **Shadow:** `0 2px 12px rgba(0,0,0,0.08)` en reposo. `0 8px 24px rgba(0,0,0,0.12)` en hover con `translateY(-2px)`.
- **Padding:** `24px 24px 20px` — generoso para el nivel ejecutivo.
- **Hover:** Solo con `@media (hover: hover) and (pointer: fine)`.

### Tables
- **Header:** Fondo `#F2F2F2`, texto uppercase 11px/700, borde inferior `2px solid #E10B17`.
- **Rows:** Padding `14px 16px`, borde inferior `1px solid #E0E0E0`, hover `background: #F2F2F2`.
- **Columnas semánticas:** `syrus-col` hereda color `#2E7D32`; `mixfm-col` hereda `#1976D2`; `diff-col` hereda `#F57C00` — solo en headers.
- **Shadow container:** `0 2px 12px rgba(0,0,0,0.08)` en el wrapper `.table-responsive`.

### Inputs / Fields
- **Style:** Fondo `#F5F6F8`, borde `1px solid rgba(0,0,0,0.13)`, radius `4px`, icono inline izquierdo.
- **Focus:** `border-color: #E10B17` + `box-shadow: 0 0 0 3px rgba(225,11,23,0.08)`.
- **Transición:** `border-color 150ms, box-shadow 150ms`.

### Status Badges
- **Activo:** Fondo `rgba(76,175,80,0.15)`, texto `#2E7D32`, pill radius `20px`, padding `4px 12px`.
- **Error:** Fondo `rgba(244,67,54,0.15)`, texto `#D32F2F`.
- **Pendiente:** Fondo `rgba(255,193,7,0.15)`, texto `#F57C00`.

### Header
- **Background:** Blanco puro, borde inferior `2px solid #E10B17`, sombra estructural `0 4px 16px rgba(0,0,0,0.12)`.
- **Logo:** 60px de ancho — proporción del logotipo institucional respetada.
- **Padding:** `20px 32px` — consistente con el ritmo del dashboard.

## 6. Do's and Don'ts

### Do:
- **Do** usar `border-top: 3px solid [color semántico]` como acento en stat cards — el acento superior no interrumpe el flujo de lectura como lo haría el lateral.
- **Do** especificar propiedades exactas en `transition`: `background-color 200ms ease-out, transform 160ms ease-out` — nunca `transition: all`.
- **Do** guardar el `@media (hover: hover) and (pointer: fine)` en todos los efectos hover de cards y botones secundarios.
- **Do** incluir `@media (prefers-reduced-motion: reduce)` que reduce `transition-duration` y `animation-duration` a `0.01ms` o sustituye movimiento por crossfade.
- **Do** usar el rojo ÁRTIMO `#E10B17` exactamente como está definido — no aproximaciones ni variaciones de tono.
- **Do** mantener colores semánticos (verde/azul/naranja) exclusivos para sus datos respectivos; nunca como color de UI genérico.

### Don't:
- **Don't** usar `border-left` mayor a `1px` como acento de color en cards, list items, o callouts — es el patrón de plantilla Bootstrap más reconocible y está prohibido en este sistema.
- **Don't** usar `border: 1px solid` + `box-shadow` con blur ≥ 16px en el mismo elemento — el "ghost-card" es el patrón codex más común y debe evitarse.
- **Don't** usar `border-radius` mayor a `8px` en cards o secciones — el sistema es cuadrado y deliberado. El exceso de redondeo (24px+) es el tell de SaaS genérico.
- **Don't** usar `transition: all` — especifica las propiedades exactas. `all` anima propiedades inesperadas y causa saltos visuales.
- **Don't** agregar efectos hover sin `@media (hover: hover) and (pointer: fine)` — los dispositivos táctiles disparan hover en tap, creando estados falsos.
- **Don't** usar gradientes de texto (`background-clip: text`) — prohibido en este sistema.
- **Don't** usar glassmorphism como decoración — blur/backdrop-filter no tienen rol en este dashboard de datos.
- **Don't** replicar la estética de plantillas Bootstrap/Material genéricas con tablas azul marino, headers con gradiente, o botones con border-radius de 8px+ en el primario.
- **Don't** usar el fondo dark estilo "hacker" (negro + neón) — incompatible con presentación a cliente corporativo.
- **Don't** usar paletas cream/beige o la estética SaaS Silicon Valley — el sistema tiene identidad ÁRTIMO propia.
