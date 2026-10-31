console.log("Sistema de Pulperia iniciado - Calderon System");

// URL base de tu Backend en C# (configurado en Backend/Properties/launchSettings.json)
const API_URL = "http://localhost:5148/api";

// ============================================================================
// 1. MÓDULO DE INVENTARIO (inventario.html)
//    Conecta con: Backend/Controllers/ProductosController.cs
// ============================================================================

let productosCache = [];

/**
 * Obtiene la lista de productos desde el controlador ProductosController en C#
 */
async function obtenerProductosDesdeBackend(terminoBusqueda = "") {
    try {
        const url = terminoBusqueda
            ? `${API_URL}/productos?buscar=${encodeURIComponent(terminoBusqueda)}`
            : `${API_URL}/productos`;

        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error(`Error HTTP: ${respuesta.status}`);

        const productos = await respuesta.json();
        if (!terminoBusqueda) {
            productosCache = productos;
        }
        return productos;
    } catch (error) {
        console.warn("⚠️ No se pudo conectar con el servidor C# en " + API_URL + ". Ejecuta 'dotnet run' en la carpeta Backend.", error);
        return [];
    }
}

/**
 * Renderiza la tabla de inventario en inventario.html
 */
async function cargarTablaInventario(terminoBusqueda = "") {
    const tbodyInventario = document.querySelector(".tabla-inventario tbody");
    if (!tbodyInventario) return;

    const productos = await obtenerProductosDesdeBackend(terminoBusqueda);
    if (productos.length === 0 && !terminoBusqueda && productosCache.length === 0) {
        return;
    }

    const parrafoTotal = document.querySelector(".encabezado-pagina p");
    if (parrafoTotal) {
        parrafoTotal.textContent = `${productosCache.length || productos.length} productos registrados.`;
    }

    const contadorMostrando = document.querySelector(".cantidad-productos");
    if (contadorMostrando) {
        const inicio = productos.length > 0 ? 1 : 0;
        contadorMostrando.innerHTML = `Mostrando <strong>${inicio}-${productos.length}</strong> de <strong>${productosCache.length || productos.length}</strong> productos`;
    }

    tbodyInventario.innerHTML = "";

    if (productos.length === 0) {
        tbodyInventario.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding: 20px; color: #94a3b8;">
                    No se encontraron productos que coincidan con "${terminoBusqueda}".
                </td>
            </tr>
        `;
        return;
    }

    productos.forEach((prod) => {
        const estadoClase = prod.activo ? "estado-activo" : "estado-inactivo";
        const estadoTexto = prod.activo ? "Activo" : "Inactivo";
        const stockClase = prod.existencia <= 5 ? "stock-bajo-alerta" : "stock-normal";

        const fila = document.createElement("tr");
        if (!prod.activo) {
            fila.style.opacity = "0.6";
        }

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
                <span class="${stockClase}">${prod.existencia} ${prod.unidadMedida}</span>
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

    tbodyInventario.querySelectorAll(".boton-editar").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = Number(btn.getAttribute("data-id"));
            const prod = productos.find((p) => p.id === id);
            if (prod) abrirModalProducto(prod);
        });
    });

    tbodyInventario.querySelectorAll(".boton-desactivar").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = Number(btn.getAttribute("data-id"));
            await cambiarEstadoProducto(id);
        });
    });
}

async function cambiarEstadoProducto(id) {
    try {
        const respuesta = await fetch(`${API_URL}/productos/${id}/estado`, {
            method: "PUT"
        });
        if (respuesta.ok) {
            const inputBusqueda = document.querySelector(".busqueda-inventario input");
            await obtenerProductosDesdeBackend();
            await cargarTablaInventario(inputBusqueda ? inputBusqueda.value : "");
        }
    } catch (error) {
        alert("Error al cambiar el estado del producto en el servidor C#.");
    }
}

function abrirModalProducto(productoEditar = null) {
    let modal = document.getElementById("modal-producto-inventario");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-producto-inventario";
        modal.style.cssText = `
            position: fixed; inset: 0; background: rgba(15, 23, 42, 0.78);
            display: flex; align-items: center; justify-content: center; z-index: 1000;
        `;
        modal.innerHTML = `
            <div style="background: #1e293b; border: 1px solid #475569; border-radius: 12px; width: 460px; max-width: 92%; padding: 24px; color: #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <h2 id="modal-producto-titulo" style="margin: 0 0 16px 0; color: #38bdf8; font-size: 20px;">Nuevo Producto</h2>
                <form id="form-modal-producto" style="display: flex; flex-direction: column; gap: 12px;">
                    <input type="hidden" id="prod-id">
                    <div>
                        <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Nombre del producto *</label>
                        <input type="text" id="prod-nombre" required placeholder="Ej. Aceite vegetal 1 Lt" style="width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Descripción</label>
                        <input type="text" id="prod-descripcion" placeholder="Ej. Botella de 1 litro" style="width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; box-sizing: border-box;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Categoría</label>
                            <select id="prod-categoria" style="width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff;">
                                <option value="Abarrotes">Abarrotes</option>
                                <option value="Bebidas">Bebidas</option>
                                <option value="Aseo personal">Aseo personal</option>
                                <option value="Galletas">Galletas</option>
                                <option value="Lácteos">Lácteos</option>
                                <option value="Otros">Otros</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Unidad de medida</label>
                            <select id="prod-unidad" style="width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff;">
                                <option value="Unidad">Unidad</option>
                                <option value="Libra">Libra</option>
                                <option value="Litro">Litro</option>
                                <option value="Paquete">Paquete</option>
                            </select>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Precio (C$) *</label>
                            <input type="number" step="0.01" min="0.01" id="prod-precio" required placeholder="0.00" style="width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Existencia inicial *</label>
                            <input type="number" step="0.5" min="0" id="prod-existencia" required placeholder="0" style="width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; box-sizing: border-box;">
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                        <button type="button" id="btn-cerrar-modal-prod" style="height: 38px; padding: 0 16px; border-radius: 8px; border: 1px solid #475569; background: #334155; color: #fff; cursor: pointer;">Cancelar</button>
                        <button type="submit" style="height: 38px; padding: 0 20px; border-radius: 8px; border: none; background: #0284c7; color: #fff; font-weight: bold; cursor: pointer;">Guardar en C#</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById("btn-cerrar-modal-prod").addEventListener("click", () => {
            modal.style.display = "none";
        });

        document.getElementById("form-modal-producto").addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("prod-id").value;
            const datosProducto = {
                id: id ? Number(id) : 0,
                nombre: document.getElementById("prod-nombre").value.trim(),
                descripcion: document.getElementById("prod-descripcion").value.trim() || "Sin descripcion",
                categoria: document.getElementById("prod-categoria").value,
                unidadMedida: document.getElementById("prod-unidad").value,
                precio: Number(document.getElementById("prod-precio").value),
                existencia: Number(document.getElementById("prod-existencia").value),
                activo: true
            };

            const metodo = id ? "PUT" : "POST";
            const url = id ? `${API_URL}/productos/${id}` : `${API_URL}/productos`;

            try {
                const resp = await fetch(url, {
                    method: metodo,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datosProducto)
                });

                if (resp.ok) {
                    modal.style.display = "none";
                    await obtenerProductosDesdeBackend();
                    await cargarTablaInventario();
                } else {
                    const err = await resp.json();
                    alert(err.mensaje || "No se pudo guardar el producto.");
                }
            } catch (error) {
                alert("Error de conexión con el servidor C#.");
            }
        });
    }

    document.getElementById("modal-producto-titulo").textContent = productoEditar ? "✏️ Editar Producto" : "➕ Nuevo Producto";
    document.getElementById("prod-id").value = productoEditar ? productoEditar.id : "";
    document.getElementById("prod-nombre").value = productoEditar ? productoEditar.nombre : "";
    document.getElementById("prod-descripcion").value = productoEditar ? productoEditar.descripcion : "";
    document.getElementById("prod-categoria").value = productoEditar ? productoEditar.categoria : "Abarrotes";
    document.getElementById("prod-unidad").value = productoEditar ? productoEditar.unidadMedida : "Unidad";
    document.getElementById("prod-precio").value = productoEditar ? productoEditar.precio : "";
    document.getElementById("prod-existencia").value = productoEditar ? productoEditar.existencia : "";

    modal.style.display = "flex";
}

function inicializarEventosInventario() {
    const btnNuevo = document.querySelector(".boton-nuevo-producto");
    if (btnNuevo) {
        btnNuevo.addEventListener("click", (e) => {
            e.preventDefault();
            abrirModalProducto(null);
        });
    }

    const inputBusqueda = document.querySelector(".busqueda-inventario input");
    const btnBuscar = document.querySelector(".busqueda-inventario button");

    if (inputBusqueda) {
        inputBusqueda.addEventListener("input", () => {
            cargarTablaInventario(inputBusqueda.value);
        });
    }
    if (btnBuscar && inputBusqueda) {
        btnBuscar.addEventListener("click", () => {
            cargarTablaInventario(inputBusqueda.value);
        });
    }
}

// ============================================================================
// 2. MÓDULO DE ENTRADAS DE INVENTARIO (Entradas.html)
//    Conecta con: Backend/Controllers/EntradasController.cs
// ============================================================================

async function inicializarModuloEntradas() {
    const selectProducto = document.getElementById("producto-entrada");
    if (!selectProducto) return;

    const ayudaStock = document.getElementById("ayuda-stock-entrada");
    const btnRegistrar = document.getElementById("btn-registrar-entrada");

    const productos = await obtenerProductosDesdeBackend();
    if (productos.length > 0) {
        selectProducto.innerHTML = `<option value="">Selecciona un producto</option>`;
        productos.filter(p => p.activo).forEach((prod) => {
            const option = document.createElement("option");
            option.value = prod.id;
            option.textContent = `${prod.nombre} (${prod.existencia} ${prod.unidadMedida})`;
            selectProducto.appendChild(option);
        });
    }

    selectProducto.addEventListener("change", () => {
        const prodId = Number(selectProducto.value);
        const prod = productosCache.find((p) => p.id === prodId);
        if (prod && ayudaStock) {
            ayudaStock.textContent = `Stock actual disponible: ${prod.existencia} ${prod.unidadMedida}`;
            ayudaStock.style.color = "#38bdf8";
        } else if (ayudaStock) {
            ayudaStock.textContent = "Selecciona un producto para ver disponibilidad.";
            ayudaStock.style.color = "";
        }
    });

    await cargarHistorialEntradas();

    if (btnRegistrar && !btnRegistrar.dataset.listenerAdded) {
        btnRegistrar.dataset.listenerAdded = "true";
        btnRegistrar.addEventListener("click", async () => {
            const productoId = Number(selectProducto.value);
            const cantidad = Number(document.getElementById("cantidad-entrada").value);
            const selectMotivo = document.getElementById("motivo-entrada");
            const motivoCodigo = selectMotivo.value;
            const motivoTexto = selectMotivo.options[selectMotivo.selectedIndex]?.text || "";
            const ingresadoPor = document.getElementById("ingresado-por").value;

            if (!productoId) {
                alert("Por favor selecciona un producto.");
                return;
            }
            if (!cantidad || cantidad <= 0) {
                alert("Ingresa una cantidad válida mayor a 0.");
                return;
            }
            if (!motivoCodigo) {
                alert("Selecciona un motivo de entrada.");
                return;
            }

            try {
                const respuesta = await fetch(`${API_URL}/entradas`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        productoId,
                        cantidad,
                        motivoCodigo,
                        motivoTexto,
                        ingresadoPor
                    })
                });

                const resultado = await respuesta.json();
                if (!respuesta.ok) {
                    alert(resultado.mensaje || "Error al registrar la entrada.");
                    return;
                }

                document.getElementById("cantidad-entrada").value = "";
                document.getElementById("motivo-entrada").value = "";
                document.getElementById("ingresado-por").value = "";
                await inicializarModuloEntradas();
                if (ayudaStock) {
                    ayudaStock.textContent = `✅ Entrada registrada. Nuevo stock: ${resultado.nuevoStock}`;
                    ayudaStock.style.color = "#4ade80";
                }
            } catch (error) {
                alert("No se pudo conectar con el servidor C#.");
            }
        });
    }
}

async function cargarHistorialEntradas() {
    const tbody = document.getElementById("tbody-entradas");
    if (!tbody) return;

    try {
        const respuesta = await fetch(`${API_URL}/entradas`);
        if (!respuesta.ok) return;
        const datos = await respuesta.json();

        const totalEl = document.getElementById("total-entradas-contador");
        const abastEl = document.getElementById("entradas-abastecimiento-contador");
        const devEl = document.getElementById("entradas-devoluciones-contador");
        const textoMostrando = document.getElementById("texto-mostrando-entradas");

        if (totalEl) totalEl.textContent = datos.totalEntradas;
        if (abastEl) abastEl.textContent = datos.porAbastecimiento;
        if (devEl) devEl.textContent = datos.porDevolucion;
        if (textoMostrando) textoMostrando.textContent = `Mostrando últimos ${datos.historial.length} ingresos`;

        tbody.innerHTML = "";
        datos.historial.forEach((item) => {
            const claseMotivo = item.motivoCodigo === "devolucion-cliente" ? "devolucion" : "stock";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.fecha}</td>
                <td><strong>${item.productoNombre}</strong></td>
                <td>
                    <span class="cantidad-entrada">
                        + ${item.cantidad} ${item.unidadMedida}
                    </span>
                </td>
                <td>
                    <span class="motivo-entrada-etiqueta ${claseMotivo}">${item.motivoTexto}</span>
                </td>
                <td>${item.ingresadoPor}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.warn("Aún sin conexión a /api/entradas");
    }
}

// ============================================================================
// 3. MÓDULO DE SALIDAS DE INVENTARIO (salidas.html)
//    Conecta con: Backend/Controllers/SalidasController.cs
// ============================================================================

async function inicializarModuloSalidas() {
    const selectProducto = document.getElementById("producto-salida");
    if (!selectProducto) return;

    const etiquetaAyuda = document.querySelector(".formulario-salida small");
    const btnRegistrar = document.querySelector(".boton-registrar-salida");

    const productos = await obtenerProductosDesdeBackend();
    if (productos.length > 0) {
        selectProducto.innerHTML = `<option value="">Selecciona un producto</option>`;
        productos.filter(p => p.activo).forEach((prod) => {
            const option = document.createElement("option");
            option.value = prod.id;
            option.textContent = `${prod.nombre} (${prod.existencia} ${prod.unidadMedida})`;
            selectProducto.appendChild(option);
        });
    }

    selectProducto.addEventListener("change", () => {
        const prodId = Number(selectProducto.value);
        const prod = productosCache.find((p) => p.id === prodId);
        if (prod && etiquetaAyuda) {
            etiquetaAyuda.textContent = `Disponible para retirar: ${prod.existencia} ${prod.unidadMedida}`;
            etiquetaAyuda.style.color = "#fbbf24";
        } else if (etiquetaAyuda) {
            etiquetaAyuda.textContent = "Selecciona un producto para ver disponibilidad.";
            etiquetaAyuda.style.color = "";
        }
    });

    await cargarHistorialSalidas();

    if (btnRegistrar && !btnRegistrar.dataset.listenerAdded) {
        btnRegistrar.dataset.listenerAdded = "true";
        btnRegistrar.addEventListener("click", async () => {
            const productoId = Number(selectProducto.value);
            const cantidad = Number(document.getElementById("cantidad-salida").value);
            const selectMotivo = document.getElementById("motivo-salida");
            const motivoCodigo = selectMotivo.value;
            const motivoTexto = selectMotivo.options[selectMotivo.selectedIndex]?.text || "";
            const retiradoPor = document.getElementById("retirado-por").value;

            if (!productoId) {
                alert("Por favor selecciona un producto.");
                return;
            }
            if (!cantidad || cantidad <= 0) {
                alert("Ingresa una cantidad válida mayor a 0.");
                return;
            }
            if (!motivoCodigo) {
                alert("Selecciona un motivo de salida.");
                return;
            }

            try {
                const respuesta = await fetch(`${API_URL}/salidas`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        productoId,
                        cantidad,
                        motivoCodigo,
                        motivoTexto,
                        retiradoPor
                    })
                });

                const resultado = await respuesta.json();
                if (!respuesta.ok) {
                    alert(resultado.mensaje || "No se pudo registrar la salida.");
                    return;
                }

                document.getElementById("cantidad-salida").value = "";
                document.getElementById("motivo-salida").value = "";
                document.getElementById("retirado-por").value = "";
                await inicializarModuloSalidas();
                if (etiquetaAyuda) {
                    etiquetaAyuda.textContent = `✅ Salida registrada. Stock restante: ${resultado.nuevoStock}`;
                    etiquetaAyuda.style.color = "#4ade80";
                }
            } catch (error) {
                alert("No se pudo conectar con el servidor C#.");
            }
        });
    }
}

async function cargarHistorialSalidas() {
    const tbody = document.querySelector(".tabla-salidas tbody");
    if (!tbody) return;

    try {
        const respuesta = await fetch(`${API_URL}/salidas`);
        if (!respuesta.ok) return;
        const salidas = await respuesta.json();

        tbody.innerHTML = "";
        salidas.forEach((item) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.fecha}</td>
                <td>${item.productoNombre}</td>
                <td>
                    <span class="cantidad-salida">
                        - ${item.cantidad} ${item.unidadMedida}
                    </span>
                </td>
                <td>${item.motivoTexto}</td>
                <td>${item.retiradoPor}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.warn("Aún sin conexión a /api/salidas");
    }
}

// ============================================================================
// 4. MÓDULO DE RECARGAS TELEFÓNICAS (recargas.html)
//    Conecta con: Backend/Controllers/RecargasController.cs
// ============================================================================

async function inicializarModuloRecargas() {
    const btnRecarga = document.querySelector(".boton-registrar-recarga");
    if (!btnRecarga) return;

    await cargarDatosRecargas();

    btnRecarga.addEventListener("click", async () => {
        const operador = document.getElementById("operador").value;
        const selectOrigen = document.getElementById("origen");
        const origen = selectOrigen.options[selectOrigen.selectedIndex]?.text || "Telefono Tigo";
        const numero = document.getElementById("numero").value.trim();
        const monto = Number(document.getElementById("monto").value);

        if (!numero) {
            alert("Ingresa el número telefónico a recargar.");
            return;
        }
        if (!monto || monto <= 0) {
            alert("Ingresa un monto válido mayor a 0.");
            return;
        }

        try {
            const respuesta = await fetch(`${API_URL}/recargas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    operador,
                    origen,
                    numero,
                    monto
                })
            });

            const resultado = await respuesta.json();
            if (!respuesta.ok) {
                alert(resultado.mensaje || "Error al registrar la recarga.");
                return;
            }

            document.getElementById("numero").value = "";
            document.getElementById("monto").value = "";
            await cargarDatosRecargas();
        } catch (error) {
            alert("No se pudo conectar con el servidor C#.");
        }
    });
}

async function cargarDatosRecargas() {
    const tbody = document.querySelector(".tabla-recargas tbody");
    if (!tbody) return;

    try {
        const respuesta = await fetch(`${API_URL}/recargas`);
        if (!respuesta.ok) return;
        const datos = await respuesta.json();

        const cuadroTigo = document.querySelector(".cuadro.tigo p");
        const cuadroClaro = document.querySelector(".cuadro.claro p");

        if (cuadroTigo) {
            cuadroTigo.innerHTML = `TIGO - Total Recargado:<br>C$ ${Number(datos.totalTigo).toFixed(2)}`;
        }
        if (cuadroClaro) {
            cuadroClaro.innerHTML = `CLARO - Total Recargado:<br>C$ ${Number(datos.totalClaro).toFixed(2)}`;
        }

        tbody.innerHTML = "";
        datos.historial.forEach((rec) => {
            const opClase = rec.operador.toLowerCase() === "claro" ? "claro" : "tigo";
            const opNombre = rec.operador.toLowerCase() === "claro" ? "Claro" : "Tigo";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${rec.fecha}</td>
                <td>
                    <span class="etiqueta ${opClase}">
                        ${opNombre}
                    </span>
                </td>
                <td>${rec.numero}</td>
                <td>${rec.origen}</td>
                <td class="monto-recarga">C$ ${Number(rec.monto).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.warn("Aún sin conexión a /api/recargas");
    }
}

// ============================================================================
// 5. MÓDULO DE NUEVA VENTA / PUNTO DE VENTA (NVenta.html)
//    Conecta con: Backend/Controllers/VentasController.cs y ProductosController.cs
// ============================================================================

let carritoVenta = [];
let categoriaSeleccionadaVenta = "Todos";

async function inicializarModuloNuevaVenta() {
    const gridCatalogo = document.querySelector(".productos-grid");
    if (!gridCatalogo) return; // No estamos en NVenta.html

    const inputBuscar = document.querySelector(".busqueda-productos input");
    const chipsCategorias = document.querySelectorAll(".categorias .categoria");
    const btnVaciar = document.querySelector(".btn-vaciar");
    const btnRegistrarVenta = document.querySelector(".btn-registrar");

    // 1. Cargar productos reales desde C#
    await obtenerProductosDesdeBackend();
    renderizarCatalogoVenta();
    renderizarCarritoVenta();

    // 2. Filtro por texto en tiempo real
    if (inputBuscar && !inputBuscar.dataset.listenerAdded) {
        inputBuscar.dataset.listenerAdded = "true";
        inputBuscar.addEventListener("input", () => {
            renderizarCatalogoVenta(inputBuscar.value);
        });
    }

    // 3. Filtro por botones de categoría
    chipsCategorias.forEach((chip) => {
        if (!chip.dataset.listenerAdded) {
            chip.dataset.listenerAdded = "true";
            chip.addEventListener("click", () => {
                chipsCategorias.forEach(c => c.classList.remove("activa"));
                chip.classList.add("activa");
                categoriaSeleccionadaVenta = chip.textContent.trim();
                renderizarCatalogoVenta(inputBuscar ? inputBuscar.value : "");
            });
        }
    });

    // 4. Botón Vaciar Carrito
    if (btnVaciar && !btnVaciar.dataset.listenerAdded) {
        btnVaciar.dataset.listenerAdded = "true";
        btnVaciar.addEventListener("click", () => {
            carritoVenta = [];
            renderizarCarritoVenta();
        });
    }

    // 5. Botón Registrar Venta (envía POST /api/ventas a C#)
    if (btnRegistrarVenta && !btnRegistrarVenta.dataset.listenerAdded) {
        btnRegistrarVenta.dataset.listenerAdded = "true";
        btnRegistrarVenta.addEventListener("click", async () => {
            if (carritoVenta.length === 0) {
                alert("Tu carrito está vacío. Agrega al menos un producto del catálogo.");
                return;
            }

            try {
                const respuesta = await fetch(`${API_URL}/ventas`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        detalles: carritoVenta.map(item => ({
                            productoId: item.id,
                            cantidad: item.cantidad
                        }))
                    })
                });

                const resultado = await respuesta.json();
                if (!respuesta.ok) {
                    alert(resultado.mensaje || "No se pudo registrar la venta.");
                    return;
                }

                alert(resultado.mensaje);
                carritoVenta = [];
                await obtenerProductosDesdeBackend();
                renderizarCatalogoVenta(inputBuscar ? inputBuscar.value : "");
                renderizarCarritoVenta();
            } catch (error) {
                alert("Error de conexión con el servidor C#.");
            }
        });
    }
}

function renderizarCatalogoVenta(textoBusqueda = "") {
    const gridCatalogo = document.querySelector(".productos-grid");
    if (!gridCatalogo || productosCache.length === 0) return;

    const termino = textoBusqueda.trim().toLowerCase();

    const filtrados = productosCache.filter((p) => {
        if (!p.activo) return false;
        const coincideCategoria =
            categoriaSeleccionadaVenta === "Todos" ||
            p.categoria.toLowerCase() === categoriaSeleccionadaVenta.toLowerCase();
        const coincideTexto =
            !termino ||
            p.nombre.toLowerCase().includes(termino) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(termino));
        return coincideCategoria && coincideTexto;
    });

    gridCatalogo.innerHTML = "";

    if (filtrados.length === 0) {
        gridCatalogo.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 20px;">No se encontraron productos disponibles en esta categoría.</p>`;
        return;
    }

    filtrados.forEach((prod) => {
        const esGranel = prod.unidadMedida.toLowerCase() === "libra";
        const sinStock = prod.existencia <= 0;

        const card = document.createElement("article");
        card.className = `producto-card ${esGranel ? "destacado" : ""}`;
        card.innerHTML = `
            <div class="producto-superior">
                <h3>${prod.nombre}</h3>
                <span class="stock">${prod.existencia} ${prod.unidadMedida}</span>
            </div>
            ${esGranel ? `<span class="producto-tipo">A granel / peso</span>` : ""}
            <p>${prod.descripcion || prod.categoria}</p>
            <div class="producto-pie">
                <strong>C$ ${Number(prod.precio).toFixed(2)}</strong>
                <button type="button" data-id="${prod.id}" ${sinStock ? "disabled style='opacity:0.5;cursor:not-allowed;'" : ""}>
                    ${sinStock ? "Agotado" : "＋ Agregar"}
                </button>
            </div>
        `;

        const btnAgregar = card.querySelector("button");
        if (!sinStock) {
            btnAgregar.addEventListener("click", () => agregarProductoAlCarrito(prod));
        }

        gridCatalogo.appendChild(card);
    });
}

function agregarProductoAlCarrito(producto) {
    const existente = carritoVenta.find((item) => item.id === producto.id);
    if (existente) {
        if (existente.cantidad + 1 > producto.existencia) {
            alert(`Solo hay ${producto.existencia} ${producto.unidadMedida} disponibles de ${producto.nombre}.`);
            return;
        }
        existente.cantidad += 1;
    } else {
        carritoVenta.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            unidadMedida: producto.unidadMedida,
            maxStock: producto.existencia,
            cantidad: 1
        });
    }
    renderizarCarritoVenta();
}

function renderizarCarritoVenta() {
    const detalleCuerpo = document.querySelector(".detalle-cuerpo");
    if (!detalleCuerpo) return;

    const divVacio = detalleCuerpo.querySelector(".carrito-vacio");
    const divNota = detalleCuerpo.querySelector(".detalle-nota");
    const strongTotal = detalleCuerpo.querySelector(".total-venta strong");

    let contenedorItems = document.getElementById("lista-items-carrito");
    if (!contenedorItems) {
        contenedorItems = document.createElement("div");
        contenedorItems.id = "lista-items-carrito";
        contenedorItems.style.cssText = "display: flex; flex-direction: column; gap: 10px; margin: 12px 0; max-height: 290px; overflow-y: auto;";
        const encabezadoTabla = detalleCuerpo.querySelector(".tabla-encabezado");
        if (encabezadoTabla) {
            encabezadoTabla.insertAdjacentElement("afterend", contenedorItems);
        }
    }

    if (carritoVenta.length === 0) {
        contenedorItems.innerHTML = "";
        contenedorItems.style.display = "none";
        if (divVacio) divVacio.style.display = "block";
        if (divNota) divNota.style.display = "block";
        if (strongTotal) strongTotal.textContent = "C$ 0.00";
        return;
    }

    if (divVacio) divVacio.style.display = "none";
    if (divNota) divNota.style.display = "none";
    contenedorItems.style.display = "flex";
    contenedorItems.innerHTML = "";

    let totalGeneral = 0;

    carritoVenta.forEach((item, index) => {
        const subtotal = item.precio * item.cantidad;
        totalGeneral += subtotal;

        const fila = document.createElement("div");
        fila.style.cssText = `
            display: grid; grid-template-columns: 1.5fr 1fr auto; align-items: center;
            gap: 8px; padding: 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; font-size: 13px;
        `;
        fila.innerHTML = `
            <div>
                <strong style="display:block; color:#f1f5f9;">${item.nombre}</strong>
                <small style="color:#94a3b8;">C$ ${Number(item.precio).toFixed(2)} / ${item.unidadMedida}</small>
            </div>
            <div style="display:flex; align-items:center; gap:5px;">
                <button type="button" class="btn-menos" style="width:24px;height:24px;border-radius:4px;border:1px solid #475569;background:#1e293b;color:#fff;cursor:pointer;">-</button>
                <span style="min-width:24px;text-align:center;font-weight:bold;">${item.cantidad}</span>
                <button type="button" class="btn-mas" style="width:24px;height:24px;border-radius:4px;border:1px solid #475569;background:#1e293b;color:#fff;cursor:pointer;">+</button>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <strong style="color:#38bdf8;">C$ ${subtotal.toFixed(2)}</strong>
                <button type="button" class="btn-quitar" title="Quitar" style="border:none;background:transparent;color:#ef4444;cursor:pointer;font-size:15px;">✕</button>
            </div>
        `;

        fila.querySelector(".btn-menos").addEventListener("click", () => {
            const paso = item.unidadMedida.toLowerCase() === "libra" ? 0.5 : 1;
            if (item.cantidad - paso <= 0) {
                carritoVenta.splice(index, 1);
            } else {
                item.cantidad = Number((item.cantidad - paso).toFixed(2));
            }
            renderizarCarritoVenta();
        });

        fila.querySelector(".btn-mas").addEventListener("click", () => {
            const paso = item.unidadMedida.toLowerCase() === "libra" ? 0.5 : 1;
            if (item.cantidad + paso > item.maxStock) {
                alert(`Stock máximo disponible: ${item.maxStock} ${item.unidadMedida}`);
                return;
            }
            item.cantidad = Number((item.cantidad + paso).toFixed(2));
            renderizarCarritoVenta();
        });

        fila.querySelector(".btn-quitar").addEventListener("click", () => {
            carritoVenta.splice(index, 1);
            renderizarCarritoVenta();
        });

        contenedorItems.appendChild(fila);
    });

    if (strongTotal) {
        strongTotal.textContent = `C$ ${totalGeneral.toFixed(2)}`;
    }
}

// ============================================================================
// 6. MÓDULO DE PANEL DE CONTROL / INICIO (index.html)
//    Conecta con: GET /api/ventas/dashboard en VentasController.cs
// ============================================================================

async function inicializarDashboardInicio() {
    const tarjetaVentas = document.querySelector(".encabezado-dashboard");
    if (!tarjetaVentas) return; // No estamos en index.html

    // Mostrar fecha actual formateada
    const divFecha = document.querySelector(".encabezado-dashboard .fecha");
    if (divFecha) {
        const opciones = { day: "numeric", month: "long", year: "numeric" };
        divFecha.textContent = new Date().toLocaleDateString("es-NI", opciones);
    }

    try {
        const respuesta = await fetch(`${API_URL}/ventas/dashboard`);
        if (!respuesta.ok) return;
        const datos = await respuesta.json();

        const pVentas = document.querySelector(".tarjeta-ventas p");
        const pProductos = document.querySelector(".tarjeta-productos p");
        const pStock = document.querySelector(".tarjeta-stock p");

        if (pVentas) pVentas.textContent = `C$ ${Number(datos.ventasDelDia).toFixed(2)}`;
        if (pProductos) pProductos.textContent = datos.totalProductos;
        if (pStock) pStock.textContent = datos.stockBajo;

        const tbodyRecientes = document.querySelector(".ventas-recientes tbody");
        if (tbodyRecientes) {
            tbodyRecientes.innerHTML = "";
            datos.ventasRecientes.forEach((v) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${v.numeroFactura}</td>
                    <td>${v.fecha}</td>
                    <td>C$ ${Number(v.total).toFixed(2)}</td>
                `;
                tbodyRecientes.appendChild(tr);
            });
        }

        const tbodyMasVendidos = document.querySelector(".stock-bajo tbody");
        if (tbodyMasVendidos) {
            tbodyMasVendidos.innerHTML = "";
            datos.masVendidos.forEach((m) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${m.producto}</td>
                    <td>${m.vendidos}</td>
                `;
                tbodyMasVendidos.appendChild(tr);
            });
        }
    } catch (error) {
        console.warn("Aún sin conexión a /api/ventas/dashboard");
    }
}

// ============================================================================
// 7. MÓDULO DE HISTORIAL DE VENTAS (historial.html)
//    Conecta con: GET /api/ventas en VentasController.cs
// ============================================================================

let filtroRapidoActual = "todo";

async function inicializarModuloHistorial() {
    const seccionHistorial = document.querySelector(".resultados-historial");
    if (!seccionHistorial) return; // No estamos en historial.html

    const btnNuevaVenta = document.querySelector(".boton-nueva-venta");
    if (btnNuevaVenta) {
        btnNuevaVenta.setAttribute("href", "NVenta.html");
    }

    const inputDesde = document.getElementById("fecha-desde");
    const inputHasta = document.getElementById("fecha-hasta");
    const inputBusqueda = document.getElementById("busqueda");
    const btnFiltrar = document.querySelector(".filtros-historial .boton-filtrar");
    const btnLimpiar = document.querySelector(".filtros-historial .boton-limpiar");
    const botonesRapidos = document.querySelectorAll(".filtros-rapidos .filtro-rapido");

    // Activar por defecto "Todo el historial" para mostrar todas las transacciones al abrir
    botonesRapidos.forEach((btn, idx) => {
        btn.classList.toggle("activo", idx === 2);
        btn.addEventListener("click", () => {
            botonesRapidos.forEach(b => b.classList.remove("activo"));
            btn.classList.add("activo");
            if (idx === 0) filtroRapidoActual = "hoy";
            else if (idx === 1) filtroRapidoActual = "7dias";
            else filtroRapidoActual = "todo";
            cargarVentasHistorial();
        });
    });

    if (btnFiltrar) {
        btnFiltrar.addEventListener("click", () => cargarVentasHistorial());
    }
    if (inputBusqueda) {
        inputBusqueda.addEventListener("input", () => cargarVentasHistorial());
    }
    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", () => {
            if (inputDesde) inputDesde.value = "";
            if (inputHasta) inputHasta.value = "";
            if (inputBusqueda) inputBusqueda.value = "";
            filtroRapidoActual = "todo";
            botonesRapidos.forEach((b, idx) => b.classList.toggle("activo", idx === 2));
            cargarVentasHistorial();
        });
    }

    await cargarVentasHistorial();
}

async function cargarVentasHistorial() {
    const seccionHistorial = document.querySelector(".resultados-historial");
    if (!seccionHistorial) return;

    const desde = document.getElementById("fecha-desde")?.value || "";
    const hasta = document.getElementById("fecha-hasta")?.value || "";
    const buscar = document.getElementById("busqueda")?.value || "";

    const params = new URLSearchParams();
    if (desde) params.append("desde", desde);
    if (hasta) params.append("hasta", hasta);
    if (buscar) params.append("buscar", buscar);
    if (filtroRapidoActual) params.append("filtroRapido", filtroRapidoActual);

    try {
        const respuesta = await fetch(`${API_URL}/ventas?${params.toString()}`);
        if (!respuesta.ok) return;
        const ventas = await respuesta.json();

        const spanCabecera = seccionHistorial.querySelector(".cabecera-resultados span");
        const divSinVentas = seccionHistorial.querySelector(".sin-ventas");

        let contenedorTabla = document.getElementById("tabla-dinamica-historial");
        if (!contenedorTabla) {
            contenedorTabla = document.createElement("div");
            contenedorTabla.id = "tabla-dinamica-historial";
            contenedorTabla.style.marginTop = "16px";
            seccionHistorial.appendChild(contenedorTabla);
        }

        if (ventas.length === 0) {
            if (spanCabecera) spanCabecera.textContent = "Mostrando 0–0 de 0 ventas";
            if (divSinVentas) divSinVentas.style.display = "block";
            contenedorTabla.innerHTML = "";
            return;
        }

        if (spanCabecera) spanCabecera.textContent = `Mostrando 1–${ventas.length} de ${ventas.length} ventas`;
        if (divSinVentas) divSinVentas.style.display = "none";

        let filasHtml = ventas.map((v) => {
            const resumenProductos = v.detalles
                .map(d => `${d.cantidad} ${d.unidadMedida} de ${d.productoNombre}`)
                .join(", ");

            return `
                <tr style="border-bottom: 1px solid #334155;">
                    <td style="padding: 14px;"><strong style="color: #38bdf8;">#${v.numeroFactura}</strong></td>
                    <td style="padding: 14px;">${v.fechaMostrar}</td>
                    <td style="padding: 14px; color: #cbd5e1;">${resumenProductos}</td>
                    <td style="padding: 14px; font-weight: bold; color: #4ade80;">C$ ${Number(v.total).toFixed(2)}</td>
                </tr>
            `;
        }).join("");

        contenedorTabla.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 10px; overflow: hidden;">
                <thead>
                    <tr style="background: #0f172a; color: #94a3b8; font-size: 12px; text-align: left;">
                        <th style="padding: 12px 14px;">FACTURA</th>
                        <th style="padding: 12px 14px;">FECHA Y HORA</th>
                        <th style="padding: 12px 14px;">DETALLE DE PRODUCTOS</th>
                        <th style="padding: 12px 14px;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasHtml}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.warn("Aún sin conexión a /api/ventas");
    }
}

// ============================================================================
// 8. MÓDULO DE REPORTES COMERCIALES (reportes.html)
//    Conecta con: GET /api/ventas/reportes en VentasController.cs
// ============================================================================

async function inicializarModuloReportes() {
    const mainReportes = document.querySelector(".reportes-principal");
    if (!mainReportes) return; // No estamos en reportes.html

    const btnImprimir = document.querySelector(".boton-imprimir");
    const btnConsultar = document.querySelector(".reportes-filtros .boton-filtrar");
    const btnLimpiar = document.querySelector(".reportes-filtros .boton-limpiar");
    const inputDesde = document.getElementById("fecha-desde");
    const inputHasta = document.getElementById("fecha-hasta");
    const msgFiltro = document.getElementById("mensaje-filtro");

    if (btnImprimir) {
        btnImprimir.addEventListener("click", () => window.print());
    }

    if (btnConsultar) {
        btnConsultar.addEventListener("click", () => {
            if (msgFiltro) {
                msgFiltro.textContent = (inputDesde.value || inputHasta.value)
                    ? `Mostrando reportes filtrados.`
                    : `Mostrando todos los reportes registrados.`;
            }
            cargarEstadisticasReportes(inputDesde?.value || "", inputHasta?.value || "");
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", () => {
            if (inputDesde) inputDesde.value = "";
            if (inputHasta) inputHasta.value = "";
            if (msgFiltro) msgFiltro.textContent = "Mostrando todos los reportes registrados.";
            cargarEstadisticasReportes();
        });
    }

    await cargarEstadisticasReportes();
}

async function cargarEstadisticasReportes(desde = "", hasta = "") {
    const mainReportes = document.querySelector(".reportes-principal");
    if (!mainReportes) return;

    const params = new URLSearchParams();
    if (desde) params.append("desde", desde);
    if (hasta) params.append("hasta", hasta);

    try {
        const respuesta = await fetch(`${API_URL}/ventas/reportes?${params.toString()}`);
        if (!respuesta.ok) return;
        const datos = await respuesta.json();

        // 1. Tarjetas superiores
        const valorVentas = document.querySelector(".tarjeta-ventas .reporte-valor");
        const valorTransacciones = document.querySelector(".tarjeta-transacciones .reporte-valor");
        const valorGanancias = document.querySelector(".tarjeta-ganancias .reporte-valor");

        if (valorVentas) valorVentas.textContent = `C$ ${Number(datos.ventasTotales).toFixed(2)}`;
        if (valorTransacciones) valorTransacciones.textContent = datos.numeroVentas;
        if (valorGanancias) valorGanancias.textContent = `C$ ${Number(datos.gananciaEstimada).toFixed(2)}`;

        // 2. Gráfico de Productos más vendidos
        const panelProductosGrafico = document.querySelector(".panel-productos .grafico-vacio");
        if (panelProductosGrafico && datos.rendimientoProductos.length > 0) {
            const maxUnidades = Math.max(...datos.rendimientoProductos.map(p => p.unidades), 1);
            panelProductosGrafico.style.cssText = "display:flex; flex-direction:column; gap:12px; padding:16px; align-items:stretch; text-align:left;";
            panelProductosGrafico.innerHTML = datos.rendimientoProductos.slice(0, 5).map(p => {
                const ancho = Math.round((p.unidades / maxUnidades) * 100);
                return `
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
                            <strong>${p.producto}</strong>
                            <span style="color:#38bdf8;">${p.unidades} vendidos (C$ ${Number(p.ingresos).toFixed(2)})</span>
                        </div>
                        <div style="background:#0f172a; height:10px; border-radius:6px; overflow:hidden;">
                            <div style="background:#0284c7; width:${ancho}%; height:100%; border-radius:6px;"></div>
                        </div>
                    </div>
                `;
            }).join("");
        }

        // 3. Ventas por categoría
        const centroCircular = document.querySelector(".grafico-circular-centro strong");
        const leyendaCat = document.querySelector(".panel-categorias .leyenda-vacia");
        if (datos.ventasPorCategoria.length > 0) {
            if (centroCircular) centroCircular.textContent = "100%";
            if (leyendaCat) {
                leyendaCat.innerHTML = datos.ventasPorCategoria
                    .map(c => `<strong style="color:#4ade80;">${c.categoria}:</strong> C$ ${Number(c.ingresos).toFixed(2)} (${c.porcentaje}%)`)
                    .join(" &nbsp;|&nbsp; ");
            }
        }

        // 4. Tablas inferiores: Ventas de mayor valor y Rendimiento de productos
        const tablasReportes = document.querySelectorAll(".reportes-tabla tbody");
        if (tablasReportes.length >= 2) {
            const tbodyMayorValor = tablasReportes[0];
            const tbodyRendimiento = tablasReportes[1];

            if (datos.ventasMayorValor.length > 0) {
                tbodyMayorValor.innerHTML = datos.ventasMayorValor.map(v => `
                    <tr>
                        <td><strong>${v.factura}</strong></td>
                        <td>${v.fecha}</td>
                        <td style="color:#4ade80; font-weight:bold;">C$ ${Number(v.montoTotal).toFixed(2)}</td>
                    </tr>
                `).join("");
            }

            if (datos.rendimientoProductos.length > 0) {
                tbodyRendimiento.innerHTML = datos.rendimientoProductos.map(p => `
                    <tr>
                        <td><strong>${p.producto}</strong></td>
                        <td>${p.unidades}</td>
                        <td style="color:#38bdf8; font-weight:bold;">C$ ${Number(p.ingresos).toFixed(2)}</td>
                    </tr>
                `).join("");
            }
        }
    } catch (error) {
        console.warn("Aún sin conexión a /api/ventas/reportes");
    }
}

// ============================================================================
// INICIALIZACIÓN AUTOMÁTICA SEGÚN LA PÁGINA ABIERTA
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    cargarTablaInventario();
    inicializarEventosInventario();
    inicializarModuloEntradas();
    inicializarModuloSalidas();
    inicializarModuloRecargas();
    inicializarModuloNuevaVenta();
    inicializarDashboardInicio();
    inicializarModuloHistorial();
    inicializarModuloReportes();
});
