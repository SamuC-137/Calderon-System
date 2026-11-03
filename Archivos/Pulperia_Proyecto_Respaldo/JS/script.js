console.log("Sistema de Pulperia iniciado - Calderon System");

// URL base de tu Backend en C# (configurado en Backend/Properties/launchSettings.json)
const API_URL = "http://localhost:5148/api";

// ============================================================================
// 1. MODULO DE INVENTARIO (inventario.html)
//    Conecta con: Backend/Controllers/ProductosController.cs
// ============================================================================

let productosCache = [];
let backendConectado = false;

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

        backendConectado = true;
        const productos = await respuesta.json();
        if (!terminoBusqueda) {
            productosCache = productos;
        }
        return productos;
    } catch (error) {
        console.warn("No se pudo conectar con el servidor C# en " + API_URL + ". Ejecuta 'dotnet run' en la carpeta Backend.", error);
        return [];
    }
}

/**
 * Renderiza la tabla de inventario en inventario.html
 */
function obtenerInfoCaducidad(fechaCaducidad) {
    if (!fechaCaducidad || fechaCaducidad === "No aplica") {
        return {
            texto: "No aplica",
            textoTarjeta: "No aplica",
            claseInventario: "caducidad-no-aplica",
            claseTarjeta: "no-aplica",
            vencido: false
        };
    }

    const partes = String(fechaCaducidad).split("-");
    let fechaFormateada = fechaCaducidad;
    let diasRestantes = 999;

    if (partes.length === 3) {
        const anio = Number(partes[0]);
        const mes = Number(partes[1]);
        const dia = Number(partes[2]);
        fechaFormateada = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaFin = new Date(anio, mes - 1, dia);
        fechaFin.setHours(0, 0, 0, 0);
        diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));
    }

    if (diasRestantes < 0) {
        return {
            texto: `Vencido (${fechaFormateada})`,
            textoTarjeta: `Vencido: ${fechaFormateada}`,
            claseInventario: "caducidad-vencido",
            claseTarjeta: "vencido",
            vencido: true
        };
    }

    if (diasRestantes <= 20) {
        return {
            texto: `Por vencer (${fechaFormateada})`,
            textoTarjeta: `Por vencer: ${fechaFormateada}`,
            claseInventario: "caducidad-por-vencer",
            claseTarjeta: "por-vencer",
            vencido: false
        };
    }

    return {
        texto: fechaFormateada,
        textoTarjeta: `Vence: ${fechaFormateada}`,
        claseInventario: "caducidad-vigente",
        claseTarjeta: "vigente",
        vencido: false
    };
}

async function cargarTablaInventario(terminoBusqueda = "") {
    const tbodyInventario = document.querySelector(".tabla-inventario tbody");
    if (!tbodyInventario) return;

    const productos = await obtenerProductosDesdeBackend(terminoBusqueda);
    if (!backendConectado && productos.length === 0 && !terminoBusqueda && productosCache.length === 0) {
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
                <td colspan="7" style="text-align:center; padding: 20px; color: #94a3b8;">
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
        const infoCaducidad = obtenerInfoCaducidad(prod.fechaCaducidad);

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
                <span class="${infoCaducidad.claseInventario}">${infoCaducidad.texto}</span>
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
                <button class="boton-eliminar" data-id="${prod.id}">
                    Eliminar
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

    tbodyInventario.querySelectorAll(".boton-eliminar").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = Number(btn.getAttribute("data-id"));
            const prod = productos.find((p) => p.id === id);
            const nombreProd = prod ? prod.nombre : "este producto";
            if (confirm(`Seguro que deseas eliminar "${nombreProd}" de la base de datos?`)) {
                await eliminarProducto(id);
            }
        });
    });
}

async function eliminarProducto(id) {
    try {
        const respuesta = await fetch(`${API_URL}/productos/${id}`, {
            method: "DELETE"
        });
        if (respuesta.ok) {
            const inputBusqueda = document.querySelector(".busqueda-inventario input");
            await obtenerProductosDesdeBackend();
            await cargarTablaInventario(inputBusqueda ? inputBusqueda.value : "");
        } else {
            const err = await respuesta.json().catch(() => ({}));
            alert(err.mensaje || "No se pudo eliminar el producto.");
        }
    } catch (error) {
        alert("Error al eliminar el producto en el servidor C#.");
    }
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
                        <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Descripcion</label>
                        <input type="text" id="prod-descripcion" placeholder="Ej. Botella de 1 litro" style="width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; box-sizing: border-box;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Categoria</label>
                            <select id="prod-categoria" style="width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff;">
                                <option value="Abarrotes">Abarrotes</option>
                                <option value="Chiverias">Chiverias</option>
                                <option value="Bebidas">Bebidas</option>
                                <option value="Aseo personal">Aseo personal</option>
                                <option value="Galletas">Galletas</option>
                                <option value="Lacteos">Lacteos</option>
                                <option value="Otros">Otros</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Unidad de medida</label>
                            <select id="prod-unidad" style="width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff;">
                                <option value="Unidad">Unidad</option>
                                <option value="Bolsa">Bolsa</option>
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
                    <div>
                        <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Fecha de caducidad (opcional para alimentos)</label>
                        <input type="date" id="prod-caducidad" style="width: 100%; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; box-sizing: border-box;">
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
            const fechaCad = document.getElementById("prod-caducidad").value;
            const datosProducto = {
                id: id ? Number(id) : 0,
                nombre: document.getElementById("prod-nombre").value.trim(),
                descripcion: document.getElementById("prod-descripcion").value.trim() || "Sin descripcion",
                categoria: document.getElementById("prod-categoria").value,
                unidadMedida: document.getElementById("prod-unidad").value,
                precio: Number(document.getElementById("prod-precio").value),
                existencia: Number(document.getElementById("prod-existencia").value),
                fechaCaducidad: fechaCad ? fechaCad : "No aplica",
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
                alert("Error de conexion con el servidor C#.");
            }
        });
    }

    document.getElementById("modal-producto-titulo").textContent = productoEditar ? "Editar Producto" : "+ Nuevo Producto";
    document.getElementById("prod-id").value = productoEditar ? productoEditar.id : "";
    document.getElementById("prod-nombre").value = productoEditar ? productoEditar.nombre : "";
    document.getElementById("prod-descripcion").value = productoEditar ? productoEditar.descripcion : "";
    document.getElementById("prod-categoria").value = productoEditar ? productoEditar.categoria : "Abarrotes";
    document.getElementById("prod-unidad").value = productoEditar ? productoEditar.unidadMedida : "Unidad";
    document.getElementById("prod-precio").value = productoEditar ? productoEditar.precio : "";
    document.getElementById("prod-existencia").value = productoEditar ? productoEditar.existencia : "";
    const cadInput = document.getElementById("prod-caducidad");
    if (cadInput) {
        cadInput.value = (productoEditar && productoEditar.fechaCaducidad && productoEditar.fechaCaducidad !== "No aplica")
            ? productoEditar.fechaCaducidad
            : "";
    }

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
// 2. MODULO DE ENTRADAS DE INVENTARIO (Entradas.html)
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
                alert("Ingresa una cantidad valida mayor a 0.");
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
                    ayudaStock.textContent = `Entrada registrada. Nuevo stock: ${resultado.nuevoStock}`;
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
        if (textoMostrando) textoMostrando.textContent = `Mostrando ultimos ${datos.historial.length} ingresos`;

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
        console.warn("Aun sin conexion a /api/entradas");
    }
}

// ============================================================================
// 3. MODULO DE SALIDAS DE INVENTARIO (salidas.html)
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
                alert("Ingresa una cantidad valida mayor a 0.");
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
                    etiquetaAyuda.textContent = `Salida registrada. Stock restante: ${resultado.nuevoStock}`;
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
        console.warn("Aun sin conexion a /api/salidas");
    }
}

// ============================================================================
// 4. MODULO DE RECARGAS TELEFONICAS (recargas.html)
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
            alert("Ingresa el numero telefonico a recargar.");
            return;
        }
        if (!monto || monto <= 0) {
            alert("Ingresa un monto valido mayor a 0.");
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
        console.warn("Aun sin conexion a /api/recargas");
    }
}

// ============================================================================
// 5. MODULO DE NUEVA VENTA / PUNTO DE VENTA (NVenta.html)
//    Conecta con: Backend/Controllers/VentasController.cs y ProductosController.cs
// ============================================================================

let carritoVenta = [];
let categoriaSeleccionadaVenta = "Todos";
let metodoPagoSeleccionado = "Efectivo";

function obtenerTotalCarrito() {
    return carritoVenta.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
}

function actualizarCalculoCambio() {
    const inputMonto = document.getElementById("monto-recibido-venta");
    const strongCambio = document.getElementById("cambio-devolver-venta");
    const contenedorCambio = document.getElementById("contenedor-cambio-venta");

    if (contenedorCambio) {
        contenedorCambio.style.display = metodoPagoSeleccionado === "Efectivo" ? "flex" : "none";
    }
    if (!inputMonto || !strongCambio) return;

    const total = obtenerTotalCarrito();
    const recibido = Number(inputMonto.value);

    if (!inputMonto.value || total <= 0) {
        strongCambio.textContent = "C$ 0.00";
        strongCambio.style.color = "#4ade80";
        return;
    }

    if (recibido < total) {
        strongCambio.textContent = `Faltan C$ ${(total - recibido).toFixed(2)}`;
        strongCambio.style.color = "#f87171";
    } else {
        strongCambio.textContent = `C$ ${(recibido - total).toFixed(2)}`;
        strongCambio.style.color = "#4ade80";
    }
}

async function inicializarModuloNuevaVenta() {
    const gridCatalogo = document.querySelector(".productos-grid");
    if (!gridCatalogo) return; // No estamos en NVenta.html

    const inputBuscar = document.querySelector(".busqueda-productos input");
    const chipsCategorias = document.querySelectorAll(".categorias .categoria");
    const botonesMetodo = document.querySelectorAll(".metodos-pago .btn-metodo");
    const inputMontoRecibido = document.getElementById("monto-recibido-venta");
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

    // 3. Filtro por botones de categoria
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

    // 4. Seleccion de Metodo de Pago (Efectivo / Transferencia)
    botonesMetodo.forEach((btn) => {
        if (!btn.dataset.listenerAdded) {
            btn.dataset.listenerAdded = "true";
            btn.addEventListener("click", () => {
                botonesMetodo.forEach(b => b.classList.remove("activo"));
                btn.classList.add("activo");
                metodoPagoSeleccionado = btn.getAttribute("data-metodo") || "Efectivo";
                actualizarCalculoCambio();
            });
        }
    });

    // 5. Calculo de cambio en tiempo real
    if (inputMontoRecibido && !inputMontoRecibido.dataset.listenerAdded) {
        inputMontoRecibido.dataset.listenerAdded = "true";
        inputMontoRecibido.addEventListener("input", () => {
            actualizarCalculoCambio();
        });
    }

    // 6. Boton Vaciar Carrito
    if (btnVaciar && !btnVaciar.dataset.listenerAdded) {
        btnVaciar.dataset.listenerAdded = "true";
        btnVaciar.addEventListener("click", () => {
            carritoVenta = [];
            if (inputMontoRecibido) inputMontoRecibido.value = "";
            renderizarCarritoVenta();
        });
    }

    // 7. Boton Registrar Venta (envia POST /api/ventas a C#)
    if (btnRegistrarVenta && !btnRegistrarVenta.dataset.listenerAdded) {
        btnRegistrarVenta.dataset.listenerAdded = "true";
        btnRegistrarVenta.addEventListener("click", async () => {
            if (carritoVenta.length === 0) {
                alert("Tu carrito esta vacio. Agrega al menos un producto del catalogo.");
                return;
            }

            const totalActual = obtenerTotalCarrito();
            let montoRecibidoEnviar = totalActual;

            if (metodoPagoSeleccionado === "Efectivo" && inputMontoRecibido && inputMontoRecibido.value.trim() !== "") {
                montoRecibidoEnviar = Number(inputMontoRecibido.value);
                if (montoRecibidoEnviar < totalActual) {
                    alert(`El monto recibido (C$ ${montoRecibidoEnviar.toFixed(2)}) es menor al total a pagar (C$ ${totalActual.toFixed(2)}).`);
                    return;
                }
            }

            try {
                const respuesta = await fetch(`${API_URL}/ventas`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        metodoPago: metodoPagoSeleccionado,
                        montoRecibido: montoRecibidoEnviar,
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

                carritoVenta = [];
                if (inputMontoRecibido) inputMontoRecibido.value = "";
                await obtenerProductosDesdeBackend();
                renderizarCatalogoVenta(inputBuscar ? inputBuscar.value : "");
                renderizarCarritoVenta();

                if (resultado.venta) {
                    mostrarModalComprobanteVenta(resultado.venta);
                } else {
                    alert(resultado.mensaje);
                }
            } catch (error) {
                alert("Error de conexion con el servidor C#.");
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
            p.categoria.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === categoriaSeleccionadaVenta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const coincideTexto =
            !termino ||
            p.nombre.toLowerCase().includes(termino) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(termino));
        return coincideCategoria && coincideTexto;
    });

    gridCatalogo.innerHTML = "";

    if (filtrados.length === 0) {
        gridCatalogo.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 20px;">No se encontraron productos disponibles en esta categoria.</p>`;
        return;
    }

    filtrados.forEach((prod) => {
        const esGranel = prod.unidadMedida.toLowerCase() === "libra";
        const sinStock = prod.existencia <= 0;
        const infoCaducidad = obtenerInfoCaducidad(prod.fechaCaducidad);
        const noDisponible = sinStock || infoCaducidad.vencido;
        const textoBoton = infoCaducidad.vencido ? "Vencido" : (sinStock ? "Agotado" : "+ Agregar");

        const card = document.createElement("article");
        card.className = `producto-card ${esGranel ? "destacado" : ""}`;
        card.innerHTML = `
            <div class="producto-superior">
                <h3>${prod.nombre}</h3>
                <span class="stock">${prod.existencia} ${prod.unidadMedida}</span>
            </div>
            <div class="producto-etiquetas">
                ${esGranel ? `<span class="producto-tipo">A granel / peso</span>` : ""}
                <span class="caducidad-badge ${infoCaducidad.claseTarjeta}">${infoCaducidad.textoTarjeta}</span>
            </div>
            <p>${prod.descripcion || prod.categoria}</p>
            <div class="producto-pie">
                <strong>C$ ${Number(prod.precio).toFixed(2)}</strong>
                <button type="button" data-id="${prod.id}" ${noDisponible ? "disabled style='opacity:0.5;cursor:not-allowed;'" : ""}>
                    ${textoBoton}
                </button>
            </div>
        `;

        const btnAgregar = card.querySelector("button");
        if (!noDisponible) {
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
        contenedorItems.style.cssText = "display: flex; flex-direction: column; gap: 10px; margin: 12px 0; max-height: 240px; overflow-y: auto;";
        const encabezadoTabla = detalleCuerpo.querySelector(".tabla-encabezado");
        if (encabezadoTabla) {
            encabezadoTabla.insertAdjacentElement("afterend", contenedorItems);
        }
    }

    if (carritoVenta.length === 0) {
        contenedorItems.innerHTML = "";
        contenedorItems.style.display = "none";
        if (divVacio) divVacio.style.display = "flex";
        if (divNota) divNota.style.display = "flex";
        if (strongTotal) strongTotal.textContent = "C$ 0.00";
        actualizarCalculoCambio();
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
                <button type="button" class="btn-quitar" title="Quitar" style="border:none;background:transparent;color:#ef4444;cursor:pointer;font-size:14px;font-weight:bold;">X</button>
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
                alert(`Stock maximo disponible: ${item.maxStock} ${item.unidadMedida}`);
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
    actualizarCalculoCambio();
}

// ============================================================================
// COMPROBANTE DE VENTA IMPRIMIBLE (Compartido entre Nueva Venta e Historial)
// ============================================================================

function mostrarModalComprobanteVenta(venta) {
    let modal = document.getElementById("modal-comprobante-venta");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-comprobante-venta";
        modal.style.cssText = `
            position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8);
            display: flex; align-items: center; justify-content: center; z-index: 1200;
        `;
        document.body.appendChild(modal);
    }

    const metodo = venta.metodoPago || "Efectivo";
    const montoRecibido = Number(venta.montoRecibido || venta.total || 0);
    const cambio = Number(venta.cambio || 0);
    const total = Number(venta.total || 0);

    const filasProductos = (venta.detalles || []).map(d => `
        <tr style="border-bottom: 1px dashed #334155;">
            <td style="padding: 8px 4px; color: #f1f5f9;">${d.productoNombre}</td>
            <td style="padding: 8px 4px; text-align: center; color: #cbd5e1;">${d.cantidad} ${d.unidadMedida}</td>
            <td style="padding: 8px 4px; text-align: right; color: #cbd5e1;">C$ ${Number(d.precioUnitario).toFixed(2)}</td>
            <td style="padding: 8px 4px; text-align: right; color: #38bdf8; font-weight: bold;">C$ ${Number(d.subtotal).toFixed(2)}</td>
        </tr>
    `).join("");

    modal.innerHTML = `
        <div style="background: #1e293b; border: 1px solid #475569; border-radius: 14px; width: 460px; max-width: 94%; padding: 24px; color: #f1f5f9; box-shadow: 0 12px 30px rgba(0,0,0,0.55);">
            <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 14px; margin-bottom: 14px;">
                <div style="font-size: 22px; font-weight: bold; color: #38bdf8;">Calderon System</div>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Comprobante de Venta</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; margin-bottom: 14px; background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
                <div><span style="color: #94a3b8;">Factura:</span> <strong style="color: #38bdf8;">#${venta.numeroFactura}</strong></div>
                <div style="text-align: right;"><span style="color: #94a3b8;">Fecha:</span> <strong>${venta.fechaMostrar}</strong></div>
                <div><span style="color: #94a3b8;">Metodo de pago:</span> <strong>${metodo}</strong></div>
                <div style="text-align: right;"><span style="color: #94a3b8;">Moneda:</span> <strong>Cordobas (C$)</strong></div>
            </div>

            <div style="max-height: 220px; overflow-y: auto; margin-bottom: 14px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="border-bottom: 1px solid #475569; color: #94a3b8; text-align: left;">
                            <th style="padding: 6px 4px;">Producto</th>
                            <th style="padding: 6px 4px; text-align: center;">Cant.</th>
                            <th style="padding: 6px 4px; text-align: right;">Precio</th>
                            <th style="padding: 6px 4px; text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasProductos}
                    </tbody>
                </table>
            </div>

            <div style="border-top: 1px solid #475569; padding-top: 12px; display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
                    <span>TOTAL A PAGAR:</span>
                    <strong style="color: #4ade80;">C$ ${total.toFixed(2)}</strong>
                </div>
                ${metodo === "Efectivo" ? `
                    <div style="display: flex; justify-content: space-between; color: #cbd5e1;">
                        <span>Monto recibido:</span>
                        <strong>C$ ${montoRecibido.toFixed(2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #38bdf8;">
                        <span>Cambio entregado:</span>
                        <strong>C$ ${cambio.toFixed(2)}</strong>
                    </div>
                ` : ""}
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button type="button" id="btn-cerrar-comprobante" style="height: 38px; padding: 0 16px; border-radius: 8px; border: 1px solid #475569; background: #334155; color: #fff; font-weight: bold; cursor: pointer;">Cerrar</button>
                <button type="button" id="btn-imprimir-comprobante" style="height: 38px; padding: 0 18px; border-radius: 8px; border: none; background: #0ea5e9; color: #fff; font-weight: bold; cursor: pointer;">Imprimir comprobante</button>
            </div>
        </div>
    `;

    modal.style.display = "flex";

    document.getElementById("btn-cerrar-comprobante").addEventListener("click", () => {
        modal.style.display = "none";
    });

    document.getElementById("btn-imprimir-comprobante").addEventListener("click", () => {
        imprimirComprobanteVenta(venta);
    });
}

function imprimirComprobanteVenta(venta) {
    const metodo = venta.metodoPago || "Efectivo";
    const montoRecibido = Number(venta.montoRecibido || venta.total || 0);
    const cambio = Number(venta.cambio || 0);
    const total = Number(venta.total || 0);

    const filas = (venta.detalles || []).map(d => `
        <tr>
            <td>${d.productoNombre}</td>
            <td style="text-align:center;">${d.cantidad} ${d.unidadMedida}</td>
            <td style="text-align:right;">C$ ${Number(d.precioUnitario).toFixed(2)}</td>
            <td style="text-align:right;">C$ ${Number(d.subtotal).toFixed(2)}</td>
        </tr>
    `).join("");

    const ventanaImpresion = window.open("", "_blank", "width=420,height=620");
    if (!ventanaImpresion) {
        window.print();
        return;
    }

    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Comprobante #${venta.numeroFactura} - Calderon System</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #111; max-width: 340px; margin: 0 auto; }
                h2 { margin: 0; text-align: center; font-size: 20px; }
                .sub { text-align: center; font-size: 12px; color: #555; margin-bottom: 14px; }
                .meta { font-size: 12px; border-top: 1px dashed #888; border-bottom: 1px dashed #888; padding: 8px 0; margin-bottom: 12px; }
                .meta div { display: flex; justify-content: space-between; margin: 3px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
                th { border-bottom: 1px solid #333; padding: 5px 2px; text-align: left; }
                td { padding: 5px 2px; border-bottom: 1px dashed #ccc; }
                .totales { border-top: 1px solid #333; padding-top: 8px; font-size: 13px; }
                .totales div { display: flex; justify-content: space-between; margin: 4px 0; }
                .pie { text-align: center; font-size: 11px; color: #555; margin-top: 18px; }
            </style>
        </head>
        <body>
            <h2>Calderon System</h2>
            <div class="sub">Comprobante de Venta</div>
            <div class="meta">
                <div><span>Factura:</span><strong>#${venta.numeroFactura}</strong></div>
                <div><span>Fecha:</span><span>${venta.fechaMostrar}</span></div>
                <div><span>Metodo de pago:</span><span>${metodo}</span></div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th style="text-align:center;">Cant.</th>
                        <th style="text-align:right;">Precio</th>
                        <th style="text-align:right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>
            <div class="totales">
                <div style="font-size:15px;font-weight:bold;"><span>TOTAL:</span><span>C$ ${total.toFixed(2)}</span></div>
                ${metodo === "Efectivo" ? `
                    <div><span>Efectivo recibido:</span><span>C$ ${montoRecibido.toFixed(2)}</span></div>
                    <div><span>Cambio:</span><span>C$ ${cambio.toFixed(2)}</span></div>
                ` : ""}
            </div>
            <div class="pie">Gracias por su compra</div>
            <script>
                window.onload = function() { window.print(); };
            <\/script>
        </body>
        </html>
    `);
    ventanaImpresion.document.close();
}

// ============================================================================
// 6. MODULO DE PANEL DE CONTROL / INICIO (index.html)
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
        console.warn("Aun sin conexion a /api/ventas/dashboard");
    }
}

// ============================================================================
// 7. MODULO DE HISTORIAL DE VENTAS (historial.html)
//    Conecta con: GET /api/ventas y DELETE /api/ventas/{id} en VentasController.cs
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
    const selectPorPagina = document.querySelector(".ventas-por-pagina");

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
    if (inputDesde) {
        inputDesde.addEventListener("change", () => cargarVentasHistorial());
    }
    if (inputHasta) {
        inputHasta.addEventListener("change", () => cargarVentasHistorial());
    }
    if (selectPorPagina) {
        selectPorPagina.addEventListener("change", () => cargarVentasHistorial());
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
    const selectPorPagina = document.querySelector(".ventas-por-pagina");
    const limitePagina = parseInt(selectPorPagina?.value || "10", 10) || 10;

    const params = new URLSearchParams();
    if (desde) params.append("desde", desde);
    if (hasta) params.append("hasta", hasta);
    if (buscar) params.append("buscar", buscar);
    if (filtroRapidoActual) params.append("filtroRapido", filtroRapidoActual);

    try {
        const respuesta = await fetch(`${API_URL}/ventas?${params.toString()}`);
        if (!respuesta.ok) return;
        const todasLasVentas = await respuesta.json();
        const ventas = todasLasVentas.slice(0, limitePagina);

        const spanCabecera = seccionHistorial.querySelector(".cabecera-resultados span");
        const divSinVentas = seccionHistorial.querySelector(".sin-ventas");

        let contenedorTabla = document.getElementById("tabla-dinamica-historial");
        if (!contenedorTabla) {
            contenedorTabla = document.createElement("div");
            contenedorTabla.id = "tabla-dinamica-historial";
            contenedorTabla.style.marginTop = "16px";
            seccionHistorial.appendChild(contenedorTabla);
        }

        if (todasLasVentas.length === 0) {
            if (spanCabecera) spanCabecera.textContent = "Mostrando 0-0 de 0 ventas";
            if (divSinVentas) divSinVentas.style.display = "flex";
            contenedorTabla.innerHTML = "";
            return;
        }

        if (spanCabecera) {
            spanCabecera.textContent = `Mostrando 1-${ventas.length} de ${todasLasVentas.length} ventas`;
        }
        if (divSinVentas) divSinVentas.style.display = "none";

        let filasHtml = ventas.map((v) => {
            const resumenProductos = (v.detalles || [])
                .map(d => `${d.cantidad} ${d.unidadMedida} de ${d.productoNombre}`)
                .join(", ");

            const metodo = v.metodoPago || "Efectivo";
            const colorMetodo = metodo.toLowerCase() === "transferencia" ? "#38bdf8" : "#4ade80";
            const infoCambio = (metodo === "Efectivo" && Number(v.cambio) > 0)
                ? `<small style="display:block; color:#94a3b8; font-size:11px; margin-top:2px;">Cambio: C$ ${Number(v.cambio).toFixed(2)}</small>`
                : "";

            return `
                <tr style="border-bottom: 1px solid #334155;">
                    <td style="padding: 14px;"><strong style="color: #38bdf8;">#${v.numeroFactura}</strong></td>
                    <td style="padding: 14px;">${v.fechaMostrar}</td>
                    <td style="padding: 14px; color: #cbd5e1;">${resumenProductos}</td>
                    <td style="padding: 14px;">
                        <span style="padding: 4px 8px; border-radius: 6px; background: rgba(15,23,42,0.7); border: 1px solid ${colorMetodo}; color: ${colorMetodo}; font-size: 11px; font-weight: bold;">
                            ${metodo}
                        </span>
                        ${infoCambio}
                    </td>
                    <td style="padding: 14px; font-weight: bold; color: #4ade80;">C$ ${Number(v.total).toFixed(2)}</td>
                    <td style="padding: 14px; white-space: nowrap;">
                        <button type="button" class="btn-ver-comprobante" data-id="${v.id}" style="padding: 6px 10px; border-radius: 7px; border: 1px solid #38bdf8; background: #0f172a; color: #38bdf8; font-size: 12px; font-weight: bold; cursor: pointer; margin-right: 6px;">
                            Comprobante
                        </button>
                        <button type="button" class="btn-cancelar-venta" data-id="${v.id}" data-factura="${v.numeroFactura}" style="padding: 6px 10px; border-radius: 7px; border: 1px solid #f87171; background: #991b1b; color: #ffffff; font-size: 12px; font-weight: bold; cursor: pointer;">
                            Cancelar
                        </button>
                    </td>
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
                        <th style="padding: 12px 14px;">PAGO</th>
                        <th style="padding: 12px 14px;">TOTAL</th>
                        <th style="padding: 12px 14px;">ACCIONES</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasHtml}
                </tbody>
            </table>
        `;

        contenedorTabla.querySelectorAll(".btn-ver-comprobante").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = Number(btn.getAttribute("data-id"));
                const venta = todasLasVentas.find(x => x.id === id);
                if (venta) mostrarModalComprobanteVenta(venta);
            });
        });

        contenedorTabla.querySelectorAll(".btn-cancelar-venta").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = Number(btn.getAttribute("data-id"));
                const factura = btn.getAttribute("data-factura");
                if (confirm(`Seguro que deseas cancelar la venta #${factura}? Las existencias se devolveran automaticamente al inventario.`)) {
                    await cancelarVentaRegistrada(id);
                }
            });
        });
    } catch (error) {
        console.warn("Aun sin conexion a /api/ventas");
    }
}

async function cancelarVentaRegistrada(id) {
    try {
        const respuesta = await fetch(`${API_URL}/ventas/${id}`, {
            method: "DELETE"
        });
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
            alert(resultado.mensaje || "No se pudo cancelar la venta.");
            return;
        }
        alert(resultado.mensaje || "Venta cancelada y existencias devueltas al inventario.");
        await cargarVentasHistorial();
    } catch (error) {
        alert("Error de conexion con el servidor C#.");
    }
}

// ============================================================================
// 8. MODULO DE REPORTES COMERCIALES (reportes.html)
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
        const valorPerdidas = document.querySelector(".tarjeta-perdidas .reporte-valor");
        const subPerdidas = document.querySelector(".tarjeta-perdidas small");

        if (valorVentas) valorVentas.textContent = `C$ ${Number(datos.ventasTotales).toFixed(2)}`;
        if (valorTransacciones) valorTransacciones.textContent = datos.numeroVentas;
        if (valorGanancias) valorGanancias.textContent = `C$ ${Number(datos.gananciaEstimada).toFixed(2)}`;

        let listaPerdidas = Array.isArray(datos.detallePerdidas) ? datos.detallePerdidas : null;
        let montoPerdidasTotal = typeof datos.perdidasTotales === "number" ? datos.perdidasTotales : 0;

        if (!listaPerdidas) {
            listaPerdidas = [];
            montoPerdidasTotal = 0;
            const prods = await obtenerProductosDesdeBackend();
            prods.forEach((p) => {
                if (p.existencia <= 0) return;
                const infoCad = obtenerInfoCaducidad(p.fechaCaducidad);
                if (infoCad.vencido) {
                    const subtotalPerdida = Number(p.existencia) * Number(p.precio);
                    montoPerdidasTotal += subtotalPerdida;
                    listaPerdidas.push({
                        producto: p.nombre,
                        categoria: p.categoria,
                        fechaCaducidad: infoCad.texto.replace("Vencido (", "").replace(")", ""),
                        motivo: "Vencido en inventario",
                        cantidad: `${p.existencia} ${p.unidadMedida}`,
                        montoPerdida: subtotalPerdida
                    });
                }
            });
        }

        if (valorPerdidas) {
            valorPerdidas.textContent = `C$ ${Number(montoPerdidasTotal).toFixed(2)}`;
        }
        if (subPerdidas) {
            subPerdidas.textContent = listaPerdidas.length > 0
                ? `${listaPerdidas.length} producto(s) vencidos o en merma`
                : "Por productos vencidos o mermas";
        }

        // 2. Grafico de Productos mas vendidos
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

        // 3. Ventas por categoria
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
            } else {
                tbodyMayorValor.innerHTML = `<tr><td colspan="3" class="estado-sin-datos">Todavia no hay ventas registradas.</td></tr>`;
            }

            if (datos.rendimientoProductos.length > 0) {
                tbodyRendimiento.innerHTML = datos.rendimientoProductos.map(p => `
                    <tr>
                        <td><strong>${p.producto}</strong></td>
                        <td>${p.unidades}</td>
                        <td style="color:#38bdf8; font-weight:bold;">C$ ${Number(p.ingresos).toFixed(2)}</td>
                    </tr>
                `).join("");
            } else {
                tbodyRendimiento.innerHTML = `<tr><td colspan="3" class="estado-sin-datos">Todavia no hay datos para mostrar.</td></tr>`;
            }
        }

        // 5. Tabla de Perdidas por vencimiento y mermas
        const tbodyPerdidas = document.getElementById("tbody-reporte-perdidas");
        if (tbodyPerdidas) {
            if (listaPerdidas.length > 0) {
                tbodyPerdidas.innerHTML = listaPerdidas.map(item => `
                    <tr>
                        <td><strong>${item.producto}</strong></td>
                        <td>${item.categoria}</td>
                        <td>${item.fechaCaducidad}</td>
                        <td><span class="caducidad-vencido">${item.motivo}</span></td>
                        <td>${item.cantidad}</td>
                        <td style="color:#f87171; font-weight:bold;">- C$ ${Number(item.montoPerdida).toFixed(2)}</td>
                    </tr>
                `).join("");
            } else {
                tbodyPerdidas.innerHTML = `
                    <tr>
                        <td colspan="6" class="estado-sin-datos">No hay perdidas registradas por productos vencidos o mermas en este periodo.</td>
                    </tr>
                `;
            }
        }
    } catch (error) {
        console.warn("Aun sin conexion a /api/ventas/reportes");
    }
}

// ============================================================================
// INICIALIZACION AUTOMATICA SEGUN LA PAGINA ABIERTA
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
