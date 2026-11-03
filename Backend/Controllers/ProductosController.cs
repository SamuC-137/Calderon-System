using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Ruta: http://localhost:5148/api/productos
    public class ProductosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private static bool _esquemaProductosVerificado = false;

        public ProductosController(ApplicationDbContext context)
        {
            _context = context;
        }

        public static async Task SincronizarEsquemaYProductosAsync(ApplicationDbContext context)
        {
            if (_esquemaProductosVerificado) return;
            try
            {
                await context.Database.ExecuteSqlRawAsync(@"
                    IF COL_LENGTH('dbo.Productos', 'FechaCaducidad') IS NULL
                        ALTER TABLE dbo.Productos ADD FechaCaducidad NVARCHAR(30) NOT NULL DEFAULT '';
                ");

                await context.Database.ExecuteSqlRawAsync(@"
                    UPDATE dbo.Productos SET FechaCaducidad = '2027-06-30' WHERE Nombre LIKE 'Arroz%' AND (FechaCaducidad IS NULL OR FechaCaducidad = '');
                    UPDATE dbo.Productos SET FechaCaducidad = '2027-08-15' WHERE Nombre LIKE 'Azucar%' AND (FechaCaducidad IS NULL OR FechaCaducidad = '');
                    UPDATE dbo.Productos SET FechaCaducidad = '2027-09-20' WHERE Nombre LIKE 'Cafe%' AND (FechaCaducidad IS NULL OR FechaCaducidad = '');
                    UPDATE dbo.Productos SET FechaCaducidad = '2027-03-15' WHERE Nombre LIKE 'Coca Cola%' AND (FechaCaducidad IS NULL OR FechaCaducidad = '');
                    UPDATE dbo.Productos SET FechaCaducidad = 'No aplica' WHERE Nombre LIKE 'Papel%' AND (FechaCaducidad IS NULL OR FechaCaducidad = '');
                    UPDATE dbo.Productos SET FechaCaducidad = '2027-10-01' WHERE Nombre LIKE 'Agua%' AND (FechaCaducidad IS NULL OR FechaCaducidad = '');

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Pan Bimbo Blanco Mediano')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Pan Bimbo Blanco Mediano', 'Pan de molde suave familiar', 'Abarrotes', 65.00, 'Paquete', 15, '2026-11-15', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Pan Bimbo Integral')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Pan Bimbo Integral', 'Pan de molde integral', 'Abarrotes', 72.00, 'Paquete', 10, '2026-11-18', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Ranchitas Nacho')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Ranchitas Nacho', 'Chiveria de maiz sabor queso', 'Chiverias', 10.00, 'Bolsa', 45, '2027-02-15', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Tostadas Diana Jalapeno')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Tostadas Diana Jalapeno', 'Chiveria de maiz picante', 'Chiverias', 10.00, 'Bolsa', 35, '2027-01-25', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Meneitos Diana')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Meneitos Diana', 'Chiveria de maiz con queso', 'Chiverias', 10.00, 'Bolsa', 40, '2027-02-10', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Alboroto Diana')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Alboroto Diana', 'Palomitas de maiz acarameladas', 'Chiverias', 12.00, 'Bolsa', 30, '2027-01-30', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Galletas Chiky')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Galletas Chiky', 'Paquete individual con chocolate', 'Galletas', 15.00, 'Paquete', 35, '2027-03-10', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Galletas Oreo')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Galletas Oreo', 'Paquete de 4 galletas rellenas', 'Galletas', 15.00, 'Paquete', 40, '2027-04-05', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Leche Entera Eskimos 1 Lt')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Leche Entera Eskimos 1 Lt', 'Leche de larga duracion', 'Lacteos', 58.00, 'Litro', 20, '2026-12-10', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Crema Pura Media Libra')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Crema Pura Media Libra', 'Crema fresca pasteurizada', 'Lacteos', 42.00, 'Libra', 12, '2026-11-12', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Huevo Nacional')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Huevo Nacional', 'Huevo blanco fresco de granja', 'Abarrotes', 7.00, 'Unidad', 60, '2026-11-25', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Jugo Hi-C Manzana 200 ml')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Jugo Hi-C Manzana 200 ml', 'Cajita de jugo individual', 'Bebidas', 18.00, 'Unidad', 28, '2027-03-20', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Salsa Naturas Ranchera')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Salsa Naturas Ranchera', 'Salsa de tomate condimentada 106 g', 'Abarrotes', 16.00, 'Unidad', 25, '2027-05-15', 1);

                    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre = 'Yogurt Vasito Eskimos')
                        INSERT INTO dbo.Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo)
                        VALUES ('Yogurt Vasito Eskimos', 'Yogurt de fresa 150 g', 'Lacteos', 22.00, 'Unidad', 4, '2026-10-20', 1);
                ");

                _esquemaProductosVerificado = true;
            }
            catch
            {
                // Ignorar si ya existe
            }
        }

        private Task AsegurarEsquemaYProductosAsync() => SincronizarEsquemaYProductosAsync(_context);

        // 1. GET: api/productos?buscar=texto
        // Obtiene todos los productos o filtra por nombre, categoria o descripcion.
        [HttpGet]
        public async Task<ActionResult<List<Producto>>> ObtenerProductos(
            [FromQuery] string? buscar = null)
        {
            await AsegurarEsquemaYProductosAsync();

            var consulta = _context.Productos.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var termino = buscar.Trim();

                consulta = consulta.Where(p =>
                    p.Nombre.Contains(termino) ||
                    p.Categoria.Contains(termino) ||
                    (p.Descripcion ?? "").Contains(termino));
            }

            var productos = await consulta.ToListAsync();

            return Ok(productos);
        }

        // 2. GET: api/productos/{id}
        // Obtiene un producto especifico por su ID.
        [HttpGet("{id}")]
        public async Task<ActionResult<Producto>> ObtenerProductoPorId(int id)
        {
            await AsegurarEsquemaYProductosAsync();

            var producto = await _context.Productos
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (producto == null)
            {
                return NotFound(new { mensaje = "Producto no encontrado" });
            }

            return Ok(producto);
        }

        // 3. POST: api/productos
        // Registra un producto nuevo en SQL Server.
        [HttpPost]
        public async Task<ActionResult<Producto>> CrearProducto(
            [FromBody] Producto producto)
        {
            await AsegurarEsquemaYProductosAsync();

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (string.IsNullOrWhiteSpace(producto.FechaCaducidad))
            {
                producto.FechaCaducidad = "No aplica";
            }

            _context.Productos.Add(producto);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(ObtenerProductoPorId),
                new { id = producto.Id },
                producto
            );
        }

        // 4. PUT: api/productos/{id}
        // Actualiza los datos de un producto existente.
        [HttpPut("{id}")]
        public async Task<IActionResult> ActualizarProducto(
            int id,
            [FromBody] Producto productoActualizado)
        {
            await AsegurarEsquemaYProductosAsync();

            if (id != productoActualizado.Id)
            {
                return BadRequest(new { mensaje = "El ID de la URL no coincide con el ID del producto" });
            }

            var producto = await _context.Productos.FindAsync(id);

            if (producto == null)
            {
                return NotFound(new { mensaje = "Producto no encontrado" });
            }

            producto.Nombre = productoActualizado.Nombre;
            producto.Descripcion = productoActualizado.Descripcion;
            producto.Categoria = productoActualizado.Categoria;
            producto.Precio = productoActualizado.Precio;
            producto.UnidadMedida = productoActualizado.UnidadMedida;
            producto.Existencia = productoActualizado.Existencia;
            producto.FechaCaducidad = string.IsNullOrWhiteSpace(productoActualizado.FechaCaducidad)
                ? "No aplica"
                : productoActualizado.FechaCaducidad;
            producto.Activo = productoActualizado.Activo;

            await _context.SaveChangesAsync();

            return Ok(producto);
        }

        // 5. PUT: api/productos/{id}/estado
        // Cambia el estado de un producto entre activo e inactivo.
        [HttpPut("{id}/estado")]
        public async Task<IActionResult> CambiarEstadoProducto(int id)
        {
            await AsegurarEsquemaYProductosAsync();

            var producto = await _context.Productos.FindAsync(id);

            if (producto == null)
            {
                return NotFound(new { mensaje = "Producto no encontrado" });
            }

            producto.Activo = !producto.Activo;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = producto.Activo
                    ? "Producto activado correctamente"
                    : "Producto desactivado correctamente",
                producto
            });
        }

        // 6. DELETE: api/productos/{id}
        // Elimina un producto de la base de datos SQL Server.
        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarProducto(int id)
        {
            await AsegurarEsquemaYProductosAsync();

            var producto = await _context.Productos.FindAsync(id);

            if (producto == null)
            {
                return NotFound(new { mensaje = "Producto no encontrado" });
            }

            var entradasRelacionadas = await _context.EntradasInventario
                .Where(e => e.ProductoId == id)
                .ToListAsync();
            if (entradasRelacionadas.Any())
            {
                _context.EntradasInventario.RemoveRange(entradasRelacionadas);
            }

            var salidasRelacionadas = await _context.SalidasInventario
                .Where(s => s.ProductoId == id)
                .ToListAsync();
            if (salidasRelacionadas.Any())
            {
                _context.SalidasInventario.RemoveRange(salidasRelacionadas);
            }

            var detallesRelacionados = await _context.DetallesVenta
                .Where(d => d.ProductoId == id)
                .ToListAsync();
            if (detallesRelacionados.Any())
            {
                _context.DetallesVenta.RemoveRange(detallesRelacionados);
            }

            _context.Productos.Remove(producto);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Producto eliminado correctamente de la base de datos"
            });
        }
    }
}
