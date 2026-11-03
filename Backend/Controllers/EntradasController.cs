using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EntradasController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public EntradasController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. GET: api/entradas
        // Consulta el historial de entradas desde SQL Server.
        [HttpGet]
        public async Task<IActionResult> ObtenerEntradas()
        {
            var entradas = await _context.EntradasInventario
                .AsNoTracking()
                .OrderByDescending(e => e.Id)
                .ToListAsync();

            int totalEntradas = entradas.Count;

            int porAbastecimiento = entradas.Count(e =>
                e.MotivoCodigo == "poco-stock" ||
                e.MotivoCodigo == "compra-proveedor");

            int porDevolucion = entradas.Count(e =>
                e.MotivoCodigo == "devolucion-cliente");

            return Ok(new
            {
                totalEntradas,
                porAbastecimiento,
                porDevolucion,
                historial = entradas
            });
        }

        // 2. POST: api/entradas
        // Registra una entrada y actualiza la existencia del producto.
        [HttpPost]
        public async Task<IActionResult> RegistrarEntrada(
            [FromBody] EntradaInventario nuevaEntrada)
        {
            if (nuevaEntrada.Cantidad <= 0)
            {
                return BadRequest(new
                {
                    mensaje = "La cantidad a ingresar debe ser mayor a 0."
                });
            }

            // Buscar el producto directamente en SQL Server.
            var producto = await _context.Productos
                .FirstOrDefaultAsync(p => p.Id == nuevaEntrada.ProductoId);

            if (producto == null)
            {
                return NotFound(new
                {
                    mensaje = "El producto seleccionado no existe en el inventario."
                });
            }

            // Actualizar la existencia.
            producto.Existencia += nuevaEntrada.Cantidad;

            // Completar los datos de la entrada.
            nuevaEntrada.Id = 0;
            nuevaEntrada.ProductoNombre = producto.Nombre;
            nuevaEntrada.UnidadMedida = producto.UnidadMedida;

            nuevaEntrada.IngresadoPor =
                string.IsNullOrWhiteSpace(nuevaEntrada.IngresadoPor)
                ? "—"
                : nuevaEntrada.IngresadoPor.Trim();

            nuevaEntrada.Fecha = DateTime.Now.ToString("dd/MM/yy HH:mm");

            // Guardar la entrada y el nuevo stock en SQL Server.
            _context.EntradasInventario.Add(nuevaEntrada);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Entrada registrada correctamente. Stock actualizado.",
                entrada = nuevaEntrada,
                nuevoStock = producto.Existencia
            });
        }
    }
}
