# Product

## Register

product

## Users

Doble audiencia: el equipo interno de ÁRTIMO (ingenieros, analistas de telemetría) y clientes empresariales con flota en ambos sistemas. Ambos acceden con credenciales propias. El contexto de uso es escritorio/oficina, sesiones de revisión periódica — no monitoreo en campo ni móvil intensivo. El trabajo concreto: verificar que Syrus4G captura más (o igual) posiciones GPS que Mix FM en las 5 placas monitoreadas, día a día y en el acumulado histórico.

## Product Purpose

Dashboard de comparativa de telemetría GPS entre dos sistemas de tracking: Syrus4G (tecnología nueva) y Mix FM (sistema legado). Valida la superioridad o paridad de Syrus4G como argumento de migración. El éxito es visible cuando el cliente puede leer, sin ambigüedad, cuántas posiciones registró cada sistema por vehículo — hoy y en el historial acumulado — y confiar en que el dato es correcto y actualizado.

## Brand Personality

Corporativo · Limpio · Profesional. Voz institucional de ÁRTIMO: directa, técnica, sin adornos. El color rojo institucional (`#E10B17`) es la única señal de identidad fuerte; el resto del sistema debe contenerse para no competir con él. El tono es el de un instrumento de precisión, no de un producto de consumo.

## Anti-references

- Plantillas genéricas Bootstrap/Material: tablas grises con headers azul marino, botones con border-radius 6px, badge coloridos — aspecto de demo.
- Dashboard "hacker" oscuro: fondo negro, texto verde neón, fuentes monoespaciadas como protagonistas — incompatible con presentación a cliente corporativo.
- SaaS genérico Silicon Valley: fondo cream/beige, Inter a todo volumen, hero-metrics con números enormes, cards excesivamente redondeadas — sin identidad ÁRTIMO.
- Consumer app playful: gradientes, ilustraciones, paleta multicolor — register equivocado para B2B de telemetría.

## Design Principles

1. **El dato primero.** Cada elemento visual justifica su espacio con información real. Decoración que no comunica se elimina.
2. **Identidad sin ruido.** El rojo ÁRTIMO ancla la identidad; el resto del sistema usa neutrales para que los datos y los colores semánticos (verde Syrus, azul Mix FM, naranja diferencia) sean legibles sin competencia visual.
3. **Confianza por consistencia.** Jerarquía tipográfica predecible, espaciado sistemático, estados claros — el cliente debe confiar en el dashboard tanto como en los números que muestra.
4. **Responsive con propósito.** El caso principal es escritorio; móvil no puede romper la lectura de tablas, pero no necesita ser el foco de optimización.
5. **Sin magia innecesaria.** Animaciones solo donde aceleran la comprensión del estado del sistema (login, actualización de datos). No como decoración.

## Accessibility & Inclusion

WCAG AA como objetivo mínimo. Contraste 4.5:1 en texto de cuerpo. El rojo institucional debe verificarse contra blancos y grises claros — es un riesgo real de contraste. Soporte básico para `prefers-reduced-motion` en animaciones de transición. No hay requisitos especiales de daltonismo declarados, pero los colores semánticos (verde/azul/naranja) no son la única señal diferenciadora — siempre acompañados de etiquetas de texto.
