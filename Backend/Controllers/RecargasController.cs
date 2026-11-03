
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecargasController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public RecargasController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. GET: api/recargas
        // Consulta el historial y calcula los totales por operador.
        [HttpGet]
        public async Task<IActionResult> ObtenerRecargas()
        {
            var recargas = await _context.Recargas
                .AsNoTracking()
                .OrderByDescending(r => r.Id)
                .ToListAsync();

            decimal totalTigo = recargas
                .Where(r => r.Operador.ToLower() == "tigo")
                .Sum(r => r.Monto);

            decimal totalClaro = recargas
                .Where(r => r.Operador.ToLower() == "claro")
                .Sum(r => r.Monto);

            return Ok(new
            {
                totalTigo,
                totalClaro,
                historial = recargas
            });
        }

        // 2. POST: api/recargas
        // Registra una nueva recarga en SQL Server.
        [HttpPost]
        public async Task<IActionResult> RegistrarRecarga(
            [FromBody] Recarga nuevaRecarga)
        {
            if (string.IsNullOrWhiteSpace(nuevaRecarga.Numero))
            {
                return BadRequest(new
                {
                    mensaje = "Debes ingresar el número telefónico a recargar."
                });
            }

            if (nuevaRecarga.Monto <= 0)
            {
                return BadRequest(new
                {
                    mensaje = "El monto de la recarga debe ser mayor a 0."
                });
            }

            if (string.IsNullOrWhiteSpace(nuevaRecarga.Operador))
            {
                return BadRequest(new
                {
                    mensaje = "Debes seleccionar un operador telefónico."
                });
            }

            nuevaRecarga.Id = 0;
            nuevaRecarga.Numero = nuevaRecarga.Numero.Trim();
            nuevaRecarga.Operador = nuevaRecarga.Operador.Trim().ToLower();
            nuevaRecarga.Fecha = DateTime.Now.ToString("dd/MM/yy HH:mm");

            _context.Recargas.Add(nuevaRecarga);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Recarga registrada exitosamente.",
                recarga = nuevaRecarga
            });
        }
    }
}
