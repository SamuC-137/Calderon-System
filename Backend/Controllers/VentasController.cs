using Microsoft.AspNetCore.Mvc;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Ruta: http://localhost:5148/api/ventas
    public class VentasController : ControllerBase
    {
        // Lista de ventas iniciales (en memoria hasta conectar SQL Server)
        public static readonly List<Venta> ListaVentas = new List<Venta>
        {
            new Venta
            {
                Id = 1,
                NumeroFactura = "01",
                FechaIso = DateTime.Now.ToString("yyyy-MM-dd"),
                FechaMostrar = DateTime.Now.AddHours(-3).ToString("dd/MM/yyyy HH:mm"),
                Total = 150.00m,
                Detalles = new List<DetalleVenta>
                {
                    new DetalleVenta { ProductoId = 1, ProductoNombre = "Arroz rio pelon", Categoria = "Abarrotes", UnidadMedida = "Libra", PrecioUnitario = 23.00m, Cantidad = 2, Subtotal = 46.00m },
                    new DetalleVenta { ProductoId = 4, ProductoNombre = "Coca Cola retornable 2 Lt", Categoria = "Bebidas", UnidadMedida = "Unidad", PrecioUnitario = 48.00m, Cantidad = 1, Subtotal = 48.00m },
                    new DetalleVenta { ProductoId = 2, ProductoNombre = "Azucar libreada", Categoria = "Abarrotes", UnidadMedida = "Libra", PrecioUnitario = 16.00m, Cantidad = 3.5m, Subtotal = 56.00m }
                }
            },
            new Venta
            {
                Id = 2,
                NumeroFactura = "02",
                FechaIso = DateTime.Now.ToString("yyyy-MM-dd"),
                FechaMostrar = DateTime.Now.AddHours(-2).ToString("dd/MM/yyyy HH:mm"),
                Total = 80.00m,
                Detalles = new List<DetalleVenta>
                {
                    new DetalleVenta { ProductoId = 2, ProductoNombre = "Azucar libreada", Categoria = "Abarrotes", UnidadMedida = "Libra", PrecioUnitario = 16.00m, Cantidad = 5, Subtotal = 80.00m }
                }
            },
            new Venta
            {
                Id = 3,
                NumeroFactura = "03",
                FechaIso = DateTime.Now.ToString("yyyy-MM-dd"),
                FechaMostrar = DateTime.Now.AddHours(-1).ToString("dd/MM/yyyy HH:mm"),
                Total = 236.00m,
                Detalles = new List<DetalleVenta>
                {
                    new DetalleVenta { ProductoId = 3, ProductoNombre = "Cafe presto 400 g", Categoria = "Abarrotes", UnidadMedida = "Unidad", PrecioUnitario = 200.00m, Cantidad = 1, Subtotal = 200.00m },
                    new DetalleVenta { ProductoId = 5, ProductoNombre = "Papel Higienico", Categoria = "Aseo personal", UnidadMedida = "Unidad", PrecioUnitario = 18.00m, Cantidad = 2, Subtotal = 36.00m }
                }
            }
        };

        // 1. GET: api/ventas
        // Consulta el historial de ventas con filtros por fecha, texto o filtro rápido (historial.html)
        [HttpGet]
        public ActionResult<List<Venta>> ObtenerVentas(
            [FromQuery] string? desde = null,
            [FromQuery] string? hasta = null,
            [FromQuery] string? buscar = null,
            [FromQuery] string? filtroRapido = null)
        {
            IEnumerable<Venta> consulta = ListaVentas;

            // Filtro rápido: "hoy" o "7dias"
            if (!string.IsNullOrWhiteSpace(filtroRapido))
            {
                var hoyIso = DateTime.Now.ToString("yyyy-MM-dd");
                if (filtroRapido == "hoy")
                {
                    consulta = consulta.Where(v => v.FechaIso == hoyIso);
                }
                else if (filtroRapido == "7dias")
                {
                    var hace7DiasIso = DateTime.Now.AddDays(-7).ToString("yyyy-MM-dd");
                    consulta = consulta.Where(v => string.Compare(v.FechaIso, hace7DiasIso) >= 0);
                }
            }

            // Filtro por rango de fechas (Desde / Hasta)
            if (!string.IsNullOrWhiteSpace(desde))
            {
                consulta = consulta.Where(v => string.Compare(v.FechaIso, desde) >= 0);
            }
            if (!string.IsNullOrWhiteSpace(hasta))
            {
                consulta = consulta.Where(v => string.Compare(v.FechaIso, hasta) <= 0);
            }

            // Filtro por número de factura o nombre de producto
            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var termino = buscar.Trim().ToLower();
                consulta = consulta.Where(v =>
                    v.NumeroFactura.ToLower().Contains(termino) ||
                    v.Detalles.Any(d => d.ProductoNombre.ToLower().Contains(termino)));
            }

            return Ok(consulta.OrderByDescending(v => v.Id).ToList());
        }

        // 2. POST: api/ventas
        // Registra una nueva venta desde NVenta.html y DESCUENTA el stock de cada producto vendido
        [HttpPost]
        public ActionResult RegistrarVenta([FromBody] Venta nuevaVenta)
        {
            if (nuevaVenta.Detalles == null || nuevaVenta.Detalles.Count == 0)
            {
                return BadRequest(new { mensaje = "El carrito está vacío. Agrega al menos un producto." });
            }

            // Paso 1: Verificar que exista stock suficiente para TODOS los productos del carrito
            foreach (var item in nuevaVenta.Detalles)
            {
                var prod = ProductosController.ListaProductos.FirstOrDefault(p => p.Id == item.ProductoId);
                if (prod == null)
                {
                    return NotFound(new { mensaje = $"El producto con ID {item.ProductoId} no existe." });
                }
                if (prod.Existencia < item.Cantidad)
                {
                    return BadRequest(new
                    {
                        mensaje = $"Stock insuficiente para '{prod.Nombre}'. Disponible: {prod.Existencia} {prod.UnidadMedida}."
                    });
                }
            }

            // Paso 2: Descontar existencias y calcular subtotales reales en C#
            decimal totalCalculado = 0;
            foreach (var item in nuevaVenta.Detalles)
            {
                var prod = ProductosController.ListaProductos.First(p => p.Id == item.ProductoId);
                prod.Existencia -= item.Cantidad;

                item.ProductoNombre = prod.Nombre;
                item.Categoria = prod.Categoria;
                item.UnidadMedida = prod.UnidadMedida;
                item.PrecioUnitario = prod.Precio;
                item.Subtotal = Math.Round(prod.Precio * item.Cantidad, 2);

                totalCalculado += item.Subtotal;
            }

            int nuevoId = ListaVentas.Count > 0 ? ListaVentas.Max(v => v.Id) + 1 : 1;
            nuevaVenta.Id = nuevoId;
            nuevaVenta.NumeroFactura = nuevoId.ToString("D2"); // Ej: "04", "05"...
            nuevaVenta.FechaIso = DateTime.Now.ToString("yyyy-MM-dd");
            nuevaVenta.FechaMostrar = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
            nuevaVenta.Total = totalCalculado;

            ListaVentas.Add(nuevaVenta);

            return Ok(new
            {
                mensaje = $"¡Venta #{nuevaVenta.NumeroFactura} registrada con éxito! Total: C$ {nuevaVenta.Total:F2}",
                venta = nuevaVenta
            });
        }

        // 3. GET: api/ventas/dashboard
        // Calcula el resumen para la página de Inicio (index.html)
        [HttpGet("dashboard")]
        public ActionResult ObtenerResumenDashboard()
        {
            var hoyIso = DateTime.Now.ToString("yyyy-MM-dd");
            decimal ventasDelDia = ListaVentas
                .Where(v => v.FechaIso == hoyIso)
                .Sum(v => v.Total);

            int totalProductos = ProductosController.ListaProductos.Count(p => p.Activo);
            int stockBajo = ProductosController.ListaProductos.Count(p => p.Activo && p.Existencia <= 10);

            var ventasRecientes = ListaVentas
                .OrderByDescending(v => v.Id)
                .Take(5)
                .Select(v => new
                {
                    numeroFactura = v.NumeroFactura,
                    fecha = v.FechaMostrar,
                    total = v.Total
                })
                .ToList();

            var masVendidos = ListaVentas
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

        // 4. GET: api/ventas/reportes
        // Calcula todas las estadísticas comerciales para reportes.html
        [HttpGet("reportes")]
        public ActionResult ObtenerReportes([FromQuery] string? desde = null, [FromQuery] string? hasta = null)
        {
            IEnumerable<Venta> ventasFiltradas = ListaVentas;

            if (!string.IsNullOrWhiteSpace(desde))
            {
                ventasFiltradas = ventasFiltradas.Where(v => string.Compare(v.FechaIso, desde) >= 0);
            }
            if (!string.IsNullOrWhiteSpace(hasta))
            {
                ventasFiltradas = ventasFiltradas.Where(v => string.Compare(v.FechaIso, hasta) <= 0);
            }

            var lista = ventasFiltradas.ToList();
            decimal ventasTotales = lista.Sum(v => v.Total);
            int numeroVentas = lista.Count;
            decimal gananciaEstimada = Math.Round(ventasTotales * 0.25m, 2); // Margen estimado del 25%

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
                .GroupBy(d => string.IsNullOrWhiteSpace(d.Categoria) ? "Otros" : d.Categoria)
                .Select(g => new
                {
                    categoria = g.Key,
                    ingresos = g.Sum(x => x.Subtotal),
                    porcentaje = ventasTotales > 0 ? Math.Round((g.Sum(x => x.Subtotal) / ventasTotales) * 100, 1) : 0
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

            return Ok(new
            {
                ventasTotales,
                numeroVentas,
                gananciaEstimada,
                rendimientoProductos,
                ventasPorCategoria,
                ventasMayorValor
            });
        }
    }
}
