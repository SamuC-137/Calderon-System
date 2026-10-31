using Microsoft.AspNetCore.Mvc;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Ruta: http://localhost:5148/api/entradas
    public class EntradasController : ControllerBase
    {
        private static readonly List<EntradaInventario> _entradas = new List<EntradaInventario>
        {
            new EntradaInventario
            {
                Id = 1,
                ProductoId = 5,
                ProductoNombre = "Papel Higienico",
                UnidadMedida = "Unidades",
                Cantidad = 2,
                MotivoCodigo = "poco-stock",
                MotivoTexto = "Poco Stock",
                IngresadoPor = "—",
                Fecha = "20/09/26 10:30"
            },
            new EntradaInventario
            {
                Id = 2,
                ProductoId = 1,
                ProductoNombre = "Arroz rio pelon",
                UnidadMedida = "Libras",
                Cantidad = 2,
                MotivoCodigo = "poco-stock",
                MotivoTexto = "Poco Stock",
                IngresadoPor = "Administracion",
                Fecha = "19/09/26 18:20"
            },
            new EntradaInventario
            {
                Id = 3,
                ProductoId = 6,
                ProductoNombre = "Agua embotellada 1 Lt",
                UnidadMedida = "Unidad",
                Cantidad = 1,
                MotivoCodigo = "devolucion-cliente",
                MotivoTexto = "Devolucion de cliente",
                IngresadoPor = "Yelder",
                Fecha = "19/09/26 15:45"
            }
        };

        // 1. GET: api/entradas
        // Devuelve el historial de entradas y los contadores de resumen
        [HttpGet]
        public ActionResult ObtenerEntradas()
        {
            int totalEntradas = _entradas.Count;
            int porAbastecimiento = _entradas.Count(e => e.MotivoCodigo == "poco-stock" || e.MotivoCodigo == "compra-proveedor");
            int porDevolucion = _entradas.Count(e => e.MotivoCodigo == "devolucion-cliente");

            return Ok(new
            {
                totalEntradas,
                porAbastecimiento,
                porDevolucion,
                historial = _entradas.OrderByDescending(e => e.Id).ToList()
            });
        }

        // 2. POST: api/entradas
        // Registra una entrada de inventario y SUMA la cantidad al stock del producto
        [HttpPost]
        public ActionResult RegistrarEntrada([FromBody] EntradaInventario nuevaEntrada)
        {
            if (nuevaEntrada.Cantidad <= 0)
            {
                return BadRequest(new { mensaje = "La cantidad a ingresar debe ser mayor a 0." });
            }

            // Buscar el producto en el inventario
            var producto = ProductosController.ListaProductos.FirstOrDefault(p => p.Id == nuevaEntrada.ProductoId);
            if (producto == null)
            {
                return NotFound(new { mensaje = "El producto seleccionado no existe en el inventario." });
            }

            // ¡LÓGICA CLAVE!: Incrementar el stock del producto en el inventario
            producto.Existencia += nuevaEntrada.Cantidad;

            // Completar datos del registro de entrada
            nuevaEntrada.Id = _entradas.Count > 0 ? _entradas.Max(e => e.Id) + 1 : 1;
            nuevaEntrada.ProductoNombre = producto.Nombre;
            nuevaEntrada.UnidadMedida = producto.UnidadMedida;
            nuevaEntrada.IngresadoPor = string.IsNullOrWhiteSpace(nuevaEntrada.IngresadoPor) ? "—" : nuevaEntrada.IngresadoPor.Trim();
            nuevaEntrada.Fecha = DateTime.Now.ToString("dd/MM/yy HH:mm");

            _entradas.Add(nuevaEntrada);

            return Ok(new
            {
                mensaje = "Entrada registrada correctamente. Stock actualizado.",
                entrada = nuevaEntrada,
                nuevoStock = producto.Existencia
            });
        }
    }
}
