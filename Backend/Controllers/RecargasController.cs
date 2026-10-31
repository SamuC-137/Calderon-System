using Microsoft.AspNetCore.Mvc;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Ruta: http://localhost:5148/api/recargas
    public class RecargasController : ControllerBase
    {
        private static readonly List<Recarga> _recargas = new List<Recarga>
        {
            new Recarga
            {
                Id = 1,
                Operador = "tigo",
                Origen = "Telefono Tigo",
                Numero = "88888888",
                Monto = 70.00m,
                Fecha = "20/09/26 05:20"
            },
            new Recarga
            {
                Id = 2,
                Operador = "claro",
                Origen = "Telefono Claro",
                Numero = "77777777",
                Monto = 50.00m,
                Fecha = "19/09/26 18:30"
            },
            new Recarga
            {
                Id = 3,
                Operador = "tigo",
                Origen = "Telefono Tigo",
                Numero = "88881111",
                Monto = 100.00m,
                Fecha = "19/09/26 15:10"
            }
        };

        // 1. GET: api/recargas
        // Devuelve el historial de recargas y la suma total por operador (Tigo y Claro)
        [HttpGet]
        public ActionResult ObtenerRecargas()
        {
            decimal totalTigo = _recargas
                .Where(r => r.Operador.ToLower() == "tigo")
                .Sum(r => r.Monto);

            decimal totalClaro = _recargas
                .Where(r => r.Operador.ToLower() == "claro")
                .Sum(r => r.Monto);

            return Ok(new
            {
                totalTigo,
                totalClaro,
                historial = _recargas.OrderByDescending(r => r.Id).ToList()
            });
        }

        // 2. POST: api/recargas
        // Registra una nueva recarga telefónica
        [HttpPost]
        public ActionResult RegistrarRecarga([FromBody] Recarga nuevaRecarga)
        {
            if (string.IsNullOrWhiteSpace(nuevaRecarga.Numero))
            {
                return BadRequest(new { mensaje = "Debes ingresar el número telefónico a recargar." });
            }

            if (nuevaRecarga.Monto <= 0)
            {
                return BadRequest(new { mensaje = "El monto de la recarga debe ser mayor a 0." });
            }

            nuevaRecarga.Id = _recargas.Count > 0 ? _recargas.Max(r => r.Id) + 1 : 1;
            nuevaRecarga.Fecha = DateTime.Now.ToString("dd/MM/yy HH:mm");

            _recargas.Add(nuevaRecarga);

            return Ok(new
            {
                mensaje = "Recarga registrada exitosamente.",
                recarga = nuevaRecarga
            });
        }
    }
}
