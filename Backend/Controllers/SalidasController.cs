using Microsoft.AspNetCore.Mvc;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Ruta: http://localhost:5148/api/salidas
    public class SalidasController : ControllerBase
    {
        private static readonly List<SalidaInventario> _salidas = new List<SalidaInventario>
        {
            new SalidaInventario
            {
                Id = 1,
                ProductoId = 5,
                ProductoNombre = "Papel Higienico",
                UnidadMedida = "Unidades",
                Cantidad = 2,
                MotivoCodigo = "consumo-personal",
                MotivoTexto = "Consumo personal/familiar",
                RetiradoPor = "—",
                Fecha = "20/09/26 10:30"
            },
            new SalidaInventario
            {
                Id = 2,
                ProductoId = 1,
                ProductoNombre = "Arroz rio pelon",
                UnidadMedida = "Libras",
                Cantidad = 2,
                MotivoCodigo = "uso-interno",
                MotivoTexto = "Uso interno",
                RetiradoPor = "Administracion",
                Fecha = "19/09/26 18:20"
            },
            new SalidaInventario
            {
                Id = 3,
                ProductoId = 6,
                ProductoNombre = "Agua embotellada 1 Lt",
                UnidadMedida = "Unidad",
                Cantidad = 1,
                MotivoCodigo = "consumo-personal",
                MotivoTexto = "Consumo personal/familiar",
                RetiradoPor = "—",
                Fecha = "19/09/26 15:45"
            }
        };

        // 1. GET: api/salidas
        // Devuelve el historial de salidas de inventario
        [HttpGet]
        public ActionResult<List<SalidaInventario>> ObtenerSalidas()
        {
            return Ok(_salidas.OrderByDescending(s => s.Id).ToList());
        }

        // 2. POST: api/salidas
        // Registra una salida de inventario y RESTA la cantidad al stock del producto
        [HttpPost]
        public ActionResult RegistrarSalida([FromBody] SalidaInventario nuevaSalida)
        {
            if (nuevaSalida.Cantidad <= 0)
            {
                return BadRequest(new { mensaje = "La cantidad a retirar debe ser mayor a 0." });
            }

            var producto = ProductosController.ListaProductos.FirstOrDefault(p => p.Id == nuevaSalida.ProductoId);
            if (producto == null)
            {
                return NotFound(new { mensaje = "El producto seleccionado no existe en el inventario." });
            }

            // Validar que haya suficiente existencia antes de restar
            if (producto.Existencia < nuevaSalida.Cantidad)
            {
                return BadRequest(new
                {
                    mensaje = $"No hay suficiente stock de {producto.Nombre}. Disponible: {producto.Existencia} {producto.UnidadMedida}."
                });
            }

            // ¡LÓGICA CLAVE!: Restar la cantidad del stock del producto
            producto.Existencia -= nuevaSalida.Cantidad;

            nuevaSalida.Id = _salidas.Count > 0 ? _salidas.Max(s => s.Id) + 1 : 1;
            nuevaSalida.ProductoNombre = producto.Nombre;
            nuevaSalida.UnidadMedida = producto.UnidadMedida;
            nuevaSalida.RetiradoPor = string.IsNullOrWhiteSpace(nuevaSalida.RetiradoPor) ? "—" : nuevaSalida.RetiradoPor.Trim();
            nuevaSalida.Fecha = DateTime.Now.ToString("dd/MM/yy HH:mm");

            _salidas.Add(nuevaSalida);

            return Ok(new
            {
                mensaje = "Salida registrada correctamente. Stock descontado.",
                salida = nuevaSalida,
                nuevoStock = producto.Existencia
            });
        }
    }
}
