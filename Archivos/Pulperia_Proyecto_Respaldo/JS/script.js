console.log("Sistema de Pulperia iniciado");

// URL base de tu Backend en C# (puerto configurado en Backend/Properties/launchSettings.json)
const API_URL = "http://localhost:5148/api";

// =========================================================
// CONEXIÓN PRINCIPAL CON EL BACKEND (ASP.NET Core C#)
// =========================================================

/**
 * Obtiene la lista de productos desde el controlador ProductosController en C#
 */
async function obtenerProductosDesdeBackend() {
    try {
        const respuesta = await fetch(`${API_URL}/productos`);
        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }
        const productos = await respuesta.json();
        console.log("✅ Conexión exitosa con el Backend en C#. Productos recibidos:", productos);
        return productos;
    } catch (error) {
        console.warn("⚠️ Aún no se detecta el servidor C# activo en " + API_URL + ". Ejecuta 'dotnet run' en la carpeta Backend.", error);
        return [];
    }
}

/**
 * Si estamos en inventario.html, renderiza en la tabla los productos que vienen de C#
 */
async function cargarTablaInventario() {
    const tbodyInventario = document.querySelector(".tabla-inventario tbody");
    if (!tbodyInventario) return; // No estamos en inventario.html

    const productos = await obtenerProductosDesdeBackend();
    if (productos.length === 0) return; // Si el backend está apagado, conserva el HTML de respaldo

    tbodyInventario.innerHTML = "";

    productos.forEach((prod) => {
        const estadoClase = prod.activo ? "estado-activo" : "estado-inactivo";
        const estadoTexto = prod.activo ? "Activo" : "Inactivo";

        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>
                <strong>${prod.nombre}</strong>
                <small>${prod.descripcion || "Sin descripcion"}</small>
            </td>
            <td>${prod.categoria}</td>
            <td>
                C$ ${Number(prod.precio).toFixed(2)} <span>/ ${prod.unidadMedida}</span>
            </td>
            <td>
                <span class="stock-normal">${prod.existencia} ${prod.unidadMedida}</span>
            </td>
            <td>
                <span class="${estadoClase}">${estadoTexto}</span>
            </td>
            <td class="acciones-producto">
                <button class="boton-editar" data-id="${prod.id}">
                    Editar
                </button>
                <button class="boton-desactivar" data-id="${prod.id}">
                    ${prod.activo ? "Desactivar" : "Activar"}
                </button>
            </td>
        `;
        tbodyInventario.appendChild(fila);
    });
}

// Inicializar al cargar cualquier página del sistema
document.addEventListener("DOMContentLoaded", () => {
    obtenerProductosDesdeBackend();
    cargarTablaInventario();
});