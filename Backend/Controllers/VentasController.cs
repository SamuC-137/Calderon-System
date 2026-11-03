using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VentasController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private static bool _esquemaVerificado = false;

        public VentasController(ApplicationDbContext context)
        {
            _context = context;
        }

        private async Task AsegurarColumnasVentasAsync()
        {
            if (_esquemaVerificado) return;
            try
            {
                await _context.Database.ExecuteSqlRawAsync(@"
                    IF COL_LENGTH('dbo.Ventas', 'MetodoPago') IS NULL
                        ALTER TABLE dbo.Ventas ADD MetodoPago NVARCHAR(30) NOT NULL DEFAULT 'Efectivo';
                    IF COL_LENGTH('dbo.Ventas', 'MontoRecibido') IS NULL
                        ALTER TABLE dbo.Ventas ADD MontoRecibido DECIMAL(18,2) NOT NULL DEFAULT 0;
                    IF COL_LENGTH('dbo.Ventas', 'Cambio') IS NULL
                        ALTER TABLE dbo.Ventas ADD Cambio DECIMAL(18,2) NOT NULL DEFAULT 0;
                ");
                _esquemaVerificado = true;
            }
            catch
            {
                // Ignorar si no requiere alteracion
            }
        }

        // 1. GET: api/ventas
        // Historial de ventas con filtros por fecha y busqueda avanzada (factura, fecha, producto, metodo de pago).
        [HttpGet]
        public async Task<IActionResult> ObtenerVentas(
            [FromQuery] string? desde = null,
            [FromQuery] string? hasta = null,
            [FromQuery] string? buscar = null,
            [FromQuery] string? filtroRapido = null)
        {
            await AsegurarColumnasVentasAsync();

            var consulta = _context.Ventas
                .AsNoTracking()
                .Include(v => v.Detalles)
                .AsQueryable();

            // Filtro rapido: hoy o ultimos 7 dias.
            if (!string.IsNullOrWhiteSpace(filtroRapido))
            {
                var hoyIso = DateTime.Now.ToString("yyyy-MM-dd");

                if (filtroRapido.Equals("hoy", StringComparison.OrdinalIgnoreCase))
                {
                    consulta = consulta.Where(v => v.FechaIso == hoyIso);
                }
                else if (filtroRapido.Equals("7dias", StringComparison.OrdinalIgnoreCase))
                {
                    var hace7DiasIso = DateTime.Now.AddDays(-7).ToString("yyyy-MM-dd");

                    consulta = consulta.Where(v =>
                        string.Compare(v.FechaIso, hace7DiasIso) >= 0);
                }
            }

            // Filtro por rango de fechas.
            if (!string.IsNullOrWhiteSpace(desde))
            {
                consulta = consulta.Where(v =>
                    string.Compare(v.FechaIso, desde) >= 0);
            }

            if (!string.IsNullOrWhiteSpace(hasta))
            {
                consulta = consulta.Where(v =>
                    string.Compare(v.FechaIso, hasta) <= 0);
            }

            // Busqueda avanzada por numero de factura, fecha, metodo de pago o nombre del producto.
            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var termino = buscar.Trim().TrimStart('#');

                consulta = consulta.Where(v =>
                    v.NumeroFactura.Contains(termino) ||
                    v.FechaMostrar.Contains(termino) ||
                    v.FechaIso.Contains(termino) ||
                    v.MetodoPago.Contains(termino) ||
                    v.Detalles.Any(d => d.ProductoNombre.Contains(termino)));
            }

            var ventas = await consulta
                .OrderByDescending(v => v.Id)
                .ToListAsync();

            return Ok(ventas);
        }

        // 2. POST: api/ventas
        // Registra una venta, metodo de pago, cambio y descuenta las existencias.
        [HttpPost]
        public async Task<IActionResult> RegistrarVenta([FromBody] Venta nuevaVenta)
        {
            await AsegurarColumnasVentasAsync();

            if (nuevaVenta.Detalles == null || nuevaVenta.Detalles.Count == 0)
            {
                return BadRequest(new
                {
                    mensaje = "El carrito esta vacio. Agrega al menos un producto."
                });
            }

            // Validar cantidades.
            if (nuevaVenta.Detalles.Any(d => d.ProductoId <= 0 || d.Cantidad <= 0))
            {
                return BadRequest(new
                {
                    mensaje = "Los productos deben tener un ID valido y una cantidad mayor a 0."
                });
            }

            // Agrupar productos repetidos para validar el stock total necesario.
            var cantidadesPorProducto = nuevaVenta.Detalles
                .GroupBy(d => d.ProductoId)
                .ToDictionary(
                    grupo => grupo.Key,
                    grupo => grupo.Sum(d => d.Cantidad)
                );

            await using var transaccion =
                await _context.Database.BeginTransactionAsync();

            var idsProductos = cantidadesPorProducto.Keys.ToList();

            var productos = await _context.Productos
                .Where(p => idsProductos.Contains(p.Id))
                .ToListAsync();

            var productosPorId = productos.ToDictionary(p => p.Id);

            // Comprobar que existan todos los productos y que tengan stock.
            foreach (var cantidad in cantidadesPorProducto)
            {
                if (!productosPorId.TryGetValue(cantidad.Key, out var producto))
                {
                    return NotFound(new
                    {
                        mensaje = $"El producto con ID {cantidad.Key} no existe."
                    });
                }

                if (producto.Existencia < cantidad.Value)
                {
                    return BadRequest(new
                    {
                        mensaje = $"Stock insuficiente para '{producto.Nombre}'. " +
                                  $"Disponible: {producto.Existencia} {producto.UnidadMedida}."
                    });
                }
            }

            // Descontar existencias y calcular los detalles de la venta.
            decimal totalCalculado = 0;

            foreach (var cantidad in cantidadesPorProducto)
            {
                productosPorId[cantidad.Key].Existencia -= cantidad.Value;
            }

            foreach (var item in nuevaVenta.Detalles)
            {
                var producto = productosPorId[item.ProductoId];

                item.Id = 0;
                item.VentaId = 0;
                item.ProductoNombre = producto.Nombre;
                item.Categoria = producto.Categoria;
                item.UnidadMedida = producto.UnidadMedida;
                item.PrecioUnitario = producto.Precio;
                item.Subtotal = Math.Round(
                    producto.Precio * item.Cantidad, 2);

                totalCalculado += item.Subtotal;
            }

            string metodoPago = string.IsNullOrWhiteSpace(nuevaVenta.MetodoPago)
                ? "Efectivo"
                : nuevaVenta.MetodoPago.Trim();

            decimal montoRecibido = nuevaVenta.MontoRecibido > 0
                ? nuevaVenta.MontoRecibido
                : totalCalculado;

            if (metodoPago.Equals("Efectivo", StringComparison.OrdinalIgnoreCase) && montoRecibido < totalCalculado)
            {
                return BadRequest(new
                {
                    mensaje = $"El monto recibido (C$ {montoRecibido:F2}) no puede ser menor al total a pagar (C$ {totalCalculado:F2})."
                });
            }

            decimal cambioCalculado = metodoPago.Equals("Efectivo", StringComparison.OrdinalIgnoreCase)
                ? Math.Max(0, Math.Round(montoRecibido - totalCalculado, 2))
                : 0;

            // Preparar los datos de la venta.
            nuevaVenta.Id = 0;
            nuevaVenta.NumeroFactura = "";
            nuevaVenta.FechaIso = DateTime.Now.ToString("yyyy-MM-dd");
            nuevaVenta.FechaMostrar = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
            nuevaVenta.MetodoPago = metodoPago;
            nuevaVenta.MontoRecibido = Math.Round(montoRecibido, 2);
            nuevaVenta.Cambio = cambioCalculado;
            nuevaVenta.Total = totalCalculado;

            // Guardar para obtener el ID generado por SQL Server.
            _context.Ventas.Add(nuevaVenta);
            await _context.SaveChangesAsync();

            // Usar el ID como numero de factura.
            nuevaVenta.NumeroFactura = nuevaVenta.Id.ToString("D2");

            await _context.SaveChangesAsync();
            await transaccion.CommitAsync();

            return Ok(new
            {
                mensaje = $"Venta #{nuevaVenta.NumeroFactura} registrada con exito. " +
                          $"Total: C$ {nuevaVenta.Total:F2}",
                venta = nuevaVenta
            });
        }

        // 3. DELETE: api/ventas/{id}
        // Cancela/anula una venta y devuelve automaticamente las existencias al inventario.
        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelarVenta(int id)
        {
            await AsegurarColumnasVentasAsync();

            await using var transaccion =
                await _context.Database.BeginTransactionAsync();

            var venta = await _context.Ventas
                .Include(v => v.Detalles)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (venta == null)
            {
                return NotFound(new
                {
                    mensaje = "No se encontro la venta que deseas cancelar."
                });
            }

            // Devolver existencias de cada producto al inventario
            var idsProductos = venta.Detalles.Select(d => d.ProductoId).Distinct().ToList();
            var productos = await _context.Productos
                .Where(p => idsProductos.Contains(p.Id))
                .ToListAsync();
            var productosPorId = productos.ToDictionary(p => p.Id);

            foreach (var detalle in venta.Detalles)
            {
                if (productosPorId.TryGetValue(detalle.ProductoId, out var producto))
                {
                    producto.Existencia += detalle.Cantidad;
                }
            }

            string numFactura = venta.NumeroFactura;

            _context.DetallesVenta.RemoveRange(venta.Detalles);
            _context.Ventas.Remove(venta);

            await _context.SaveChangesAsync();
            await transaccion.CommitAsync();

            return Ok(new
            {
                mensaje = $"Venta #{numFactura} cancelada correctamente. Las existencias fueron devueltas al inventario."
            });
        }

        // 4. GET: api/ventas/dashboard
        // Resumen para la pagina de Inicio.
        [HttpGet("dashboard")]
        public async Task<IActionResult> ObtenerResumenDashboard()
        {
            await AsegurarColumnasVentasAsync();

            var hoyIso = DateTime.Now.ToString("yyyy-MM-dd");

            var ventas = await _context.Ventas
                .AsNoTracking()
                .Include(v => v.Detalles)
                .ToListAsync();

            var productos = await _context.Productos
                .AsNoTracking()
                .Where(p => p.Activo)
                .ToListAsync();

            decimal ventasDelDia = ventas
                .Where(v => v.FechaIso == hoyIso)
                .Sum(v => v.Total);

            int totalProductos = productos.Count;
            int stockBajo = productos.Count(p => p.Existencia <= 10);

            var ventasRecientes = ventas
                .OrderByDescending(v => v.Id)
                .Take(5)
                .Select(v => new
                {
                    numeroFactura = v.NumeroFactura,
                    fecha = v.FechaMostrar,
                    total = v.Total
                })
                .ToList();

            var masVendidos = ventas
                .SelectMany(v => v.Detalles)
                .GroupBy(d => d.ProductoNombre)
                .Select(g => new
                {
                    producto = g.Key,
                    vendidos = g.Sum(x => x.Cantidad)
                })
                .OrderByDescending(x => x.vendidos)
                .Take(5)
                .ToList();

            return Ok(new
            {
                ventasDelDia,
                totalProductos,
                stockBajo,
                ventasRecientes,
                masVendidos
            });
        }

        // 5. GET: api/ventas/reportes
        // Estadisticas comerciales para reportes.html (incluyendo Perdidas por vencimiento/mermas).
        [HttpGet("reportes")]
        public async Task<IActionResult> ObtenerReportes(
            [FromQuery] string? desde = null,
            [FromQuery] string? hasta = null)
        {
            await AsegurarColumnasVentasAsync();
            await ProductosController.SincronizarEsquemaYProductosAsync(_context);

            var consulta = _context.Ventas
                .AsNoTracking()
                .Include(v => v.Detalles)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(desde))
            {
                consulta = consulta.Where(v =>
                    string.Compare(v.FechaIso, desde) >= 0);
            }

            if (!string.IsNullOrWhiteSpace(hasta))
            {
                consulta = consulta.Where(v =>
                    string.Compare(v.FechaIso, hasta) <= 0);
            }

            var lista = await consulta.ToListAsync();

            decimal ventasTotales = lista.Sum(v => v.Total);
            int numeroVentas = lista.Count;

            decimal gananciaEstimada =
                Math.Round(ventasTotales * 0.25m, 2);

            var rendimientoProductos = lista
                .SelectMany(v => v.Detalles)
                .GroupBy(d => d.ProductoNombre)
                .Select(g => new
                {
                    producto = g.Key,
                    unidades = g.Sum(x => x.Cantidad),
                    ingresos = g.Sum(x => x.Subtotal)
                })
                .OrderByDescending(x => x.unidades)
                .ToList();

            var ventasPorCategoria = lista
                .SelectMany(v => v.Detalles)
                .GroupBy(d =>
                    string.IsNullOrWhiteSpace(d.Categoria)
                        ? "Otros"
                        : d.Categoria)
                .Select(g => new
                {
                    categoria = g.Key,
                    ingresos = g.Sum(x => x.Subtotal),
                    porcentaje = ventasTotales > 0
                        ? Math.Round(
                            (g.Sum(x => x.Subtotal) / ventasTotales) * 100, 1)
                        : 0
                })
                .OrderByDescending(x => x.ingresos)
                .ToList();

            var ventasMayorValor = lista
                .OrderByDescending(v => v.Total)
                .Take(5)
                .Select(v => new
                {
                    factura = "#" + v.NumeroFactura,
                    fecha = v.FechaMostrar,
                    montoTotal = v.Total
                })
                .ToList();

            // Calculo de Perdidas por productos vencidos en inventario y salidas por vencimiento/merma
            var hoyIso = DateTime.Now.ToString("yyyy-MM-dd");
            var todosLosProductos = await _context.Productos
                .AsNoTracking()
                .ToListAsync();

            var salidasRegistradas = await _context.SalidasInventario
                .AsNoTracking()
                .ToListAsync();

            var detallePerdidas = new List<object>();
            decimal perdidasTotales = 0;

            foreach (var prod in todosLosProductos)
            {
                if (prod.Existencia <= 0) continue;
                if (string.IsNullOrWhiteSpace(prod.FechaCaducidad) ||
                    prod.FechaCaducidad.Equals("No aplica", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (string.Compare(prod.FechaCaducidad, hoyIso) < 0)
                {
                    if (!string.IsNullOrWhiteSpace(desde) && string.Compare(prod.FechaCaducidad, desde) < 0)
                        continue;
                    if (!string.IsNullOrWhiteSpace(hasta) && string.Compare(prod.FechaCaducidad, hasta) > 0)
                        continue;

                    decimal monto = Math.Round(prod.Existencia * prod.Precio, 2);
                    perdidasTotales += monto;

                    string fechaFormateada = prod.FechaCaducidad;
                    var partes = prod.FechaCaducidad.Split('-');
                    if (partes.Length == 3)
                    {
                        fechaFormateada = $"{partes[2]}/{partes[1]}/{partes[0]}";
                    }

                    detallePerdidas.Add(new
                    {
                        producto = prod.Nombre,
                        categoria = prod.Categoria,
                        fechaCaducidad = fechaFormateada,
                        motivo = "Vencido en inventario",
                        cantidad = $"{prod.Existencia} {prod.UnidadMedida}",
                        precioUnitario = prod.Precio,
                        montoPerdida = monto
                    });
                }
            }

            var productosDict = todosLosProductos.ToDictionary(p => p.Id);
            foreach (var salida in salidasRegistradas)
            {
                bool esPerdida =
                    salida.MotivoCodigo.Equals("vencimiento", StringComparison.OrdinalIgnoreCase) ||
                    salida.MotivoCodigo.Equals("merma", StringComparison.OrdinalIgnoreCase) ||
                    salida.MotivoTexto.Contains("vencid", StringComparison.OrdinalIgnoreCase) ||
                    salida.MotivoTexto.Contains("merma", StringComparison.OrdinalIgnoreCase);

                if (!esPerdida) continue;

                decimal precioUnit = productosDict.TryGetValue(salida.ProductoId, out var prodRef)
                    ? prodRef.Precio
                    : 0;
                string categoriaRef = productosDict.TryGetValue(salida.ProductoId, out var prodCat)
                    ? prodCat.Categoria
                    : "Inventario";

                decimal monto = Math.Round(salida.Cantidad * precioUnit, 2);
                perdidasTotales += monto;

                detallePerdidas.Add(new
                {
                    producto = salida.ProductoNombre,
                    categoria = categoriaRef,
                    fechaCaducidad = salida.Fecha,
                    motivo = string.IsNullOrWhiteSpace(salida.MotivoTexto) ? "Retiro por vencimiento / merma" : salida.MotivoTexto,
                    cantidad = $"{salida.Cantidad} {salida.UnidadMedida}",
                    precioUnitario = precioUnit,
                    montoPerdida = monto
                });
            }

            return Ok(new
            {
                ventasTotales,
                numeroVentas,
                gananciaEstimada,
                perdidasTotales,
                productosVencidosCount = detallePerdidas.Count,
                detallePerdidas,
                rendimientoProductos,
                ventasPorCategoria,
                ventasMayorValor
            });
        }
    }
}
