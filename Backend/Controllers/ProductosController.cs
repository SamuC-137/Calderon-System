using Microsoft.AspNetCore.Mvc;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Ruta: http://localhost:5123/api/productos
    public class ProductosController : ControllerBase
    {
        // Lista en memoria (simula la base de datos hasta que conectemos SQL Server)
        private static readonly List<Producto> _productos = new List<Producto>
        {
            new Producto
            {
                Id = 1,
                Nombre = "Arroz rio pelon",
                Descripcion = "Arroz tipo grano azul",
                Categoria = "Abarrotes",
                Precio = 23.00m,
                UnidadMedida = "Libra",
                Existencia = 88.5m,
                Activo = true
            },
            new Producto
            {
                Id = 2,
                Nombre = "Azucar libreada",
                Descripcion = "Sin descripcion",
                Categoria = "Abarrotes",
                Precio = 16.00m,
                UnidadMedida = "Libra",
                Existencia = 97m,
                Activo = true
            },
            new Producto
            {
                Id = 3,
                Nombre = "Cafe presto 400 g",
                Descripcion = "Sin descripcion",
                Categoria = "Abarrotes",
                Precio = 200.00m,
                UnidadMedida = "Unidad",
                Existencia = 23m,
                Activo = true
            },
            new Producto
            {
                Id = 4,
                Nombre = "Coca Cola retornable 2 Lt",
                Descripcion = "Sin descripcion",
                Categoria = "Bebidas",
                Precio = 48.00m,
                UnidadMedida = "Unidad",
                Existencia = 23m,
                Activo = true
            }
        };

        // GET: api/productos
        // Obtiene todos los productos del inventario
        [HttpGet]
        public ActionResult<List<Producto>> ObtenerProductos()
        {
            return Ok(_productos);
        }

        // GET: api/productos/{id}
        // Obtiene un producto específico por su ID
        [HttpGet("{id}")]
        public ActionResult<Producto> ObtenerProductoPorId(int id)
        {
            var producto = _productos.FirstOrDefault(p => p.Id == id);
            if (producto == null)
            {
                return NotFound(new { mensaje = "Producto no encontrado" });
            }
            return Ok(producto);
        }

        // POST: api/productos
        // Registra un nuevo producto enviado desde el Frontend
        [HttpPost]
        public ActionResult<Producto> CrearProducto([FromBody] Producto nuevoProducto)
        {
            nuevoProducto.Id = _productos.Count > 0 ? _productos.Max(p => p.Id) + 1 : 1;
            _productos.Add(nuevoProducto);
            return CreatedAtAction(nameof(ObtenerProductoPorId), new { id = nuevoProducto.Id }, nuevoProducto);
        }

        // PUT: api/productos/{id}
        // Actualiza los datos o existencia de un producto
        [HttpPut("{id}")]
        public ActionResult<Producto> ActualizarProducto(int id, [FromBody] Producto productoActualizado)
        {
            var producto = _productos.FirstOrDefault(p => p.Id == id);
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
            producto.Activo = productoActualizado.Activo;

            return Ok(producto);
        }
    }
}
