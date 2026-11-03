
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SalidasController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SalidasController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. GET: api/salidas
        // Consulta el historial de salidas desde SQL Server.
        [HttpGet]
        public async Task<IActionResult> ObtenerSalidas()
        {
            var salidas = await _context.SalidasInventario
                .AsNoTracking()
                .OrderByDescending(s => s.Id)
                .ToListAsync();

            return Ok(salidas);
        }

        // 2. POST: api/salidas
        // Registra una salida y descuenta las existencias.
        [HttpPost]
        public async Task<IActionResult> RegistrarSalida(
            [FromBody] SalidaInventario nuevaSalida)
        {
            if (nuevaSalida.Cantidad <= 0)
            {
                return BadRequest(new
                {
                    mensaje = "La cantidad a retirar debe ser mayor a 0."
                });
            }

            // Buscar el producto en SQL Server.
            var producto = await _context.Productos
                .FirstOrDefaultAsync(p => p.Id == nuevaSalida.ProductoId);

            if (producto == null)
            {
                return NotFound(new
                {
                    mensaje = "El producto seleccionado no existe en el inventario."
                });
            }

            // Comprobar que exista suficiente stock.
            if (producto.Existencia < nuevaSalida.Cantidad)
            {
                return BadRequest(new
                {
                    mensaje = $"No hay suficiente stock de {producto.Nombre}. Disponible: {producto.Existencia} {producto.UnidadMedida}."
                });
            }

            // Descontar las existencias.
            producto.Existencia -= nuevaSalida.Cantidad;

            // Completar los datos de la salida.
            nuevaSalida.Id = 0;
            nuevaSalida.ProductoNombre = producto.Nombre;
            nuevaSalida.UnidadMedida = producto.UnidadMedida;

            nuevaSalida.RetiradoPor =
                string.IsNullOrWhiteSpace(nuevaSalida.RetiradoPor)
                ? "—"
                : nuevaSalida.RetiradoPor.Trim();

            nuevaSalida.Fecha = DateTime.Now.ToString("dd/MM/yy HH:mm");

            // Guardar la salida y el nuevo stock.
            _context.SalidasInventario.Add(nuevaSalida);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Salida registrada correctamente. Stock descontado.",
                salida = nuevaSalida,
                nuevoStock = producto.Existencia
            });
        }
    }
}
