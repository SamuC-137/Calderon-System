using Microsoft.AspNetCore.Mvc;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Ruta: http://localhost:5148/api/productos
    public class ProductosController : ControllerBase
    {
        // Lista estática pública para que Entradas, Salidas y Ventas puedan consultar y actualizar el stock
        public static readonly List<Producto> ListaProductos = new List<Producto>
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
                Descripcion = "Cafe instantaneo",
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
                Descripcion = "Bebida gaseosa",
                Categoria = "Bebidas",
                Precio = 48.00m,
                UnidadMedida = "Unidad",
                Existencia = 23m,
                Activo = true
            },
            new Producto
            {
                Id = 5,
                Nombre = "Papel Higienico",
                Descripcion = "Rollo individual",
                Categoria = "Aseo personal",
                Precio = 18.00m,
                UnidadMedida = "Unidad",
                Existencia = 30m,
                Activo = true
            },
            new Producto
            {
                Id = 6,
                Nombre = "Agua embotellada 1 Lt",
                Descripcion = "Agua purificada",
                Categoria = "Bebidas",
                Precio = 20.00m,
                UnidadMedida = "Unidad",
                Existencia = 40m,
                Activo = true
            }
        };

        // 1. GET: api/productos?buscar=texto
        // Obtiene todos los productos (o filtra por nombre/categoría si se envía el parámetro 'buscar')
        [HttpGet]
        public ActionResult<List<Producto>> ObtenerProductos([FromQuery] string? buscar = null)
        {
            if (string.IsNullOrWhiteSpace(buscar))
            {
                return Ok(ListaProductos);
            }

            var termino = buscar.Trim().ToLower();
            var filtrados = ListaProductos
                .Where(p => p.Nombre.ToLower().Contains(termino) ||
                            p.Categoria.ToLower().Contains(termino) ||
                            p.Descripcion.ToLower().Contains(termino))
                .ToList();

            return Ok(filtrados);
        }

        // 2. GET: api/productos/{id}
        // Obtiene un producto específico por su ID
        [HttpGet("{id}")]
        public ActionResult<Producto> ObtenerProductoPorId(int id)
        {
            var producto = ListaProductos.FirstOrDefault(p => p.Id == id);
            if (producto == null)
            {
                return NotFound(new { mensaje = "Producto no encontrado" });
            }
            return Ok(producto);
        }

        // 3. POST: api/productos
        // Registra un nuevo producto enviado desde el Frontend
        [HttpPost]
        public ActionResult<Producto> CrearProducto([FromBody] Producto nuevoProducto)
        {
            if (string.IsNullOrWhiteSpace(nuevoProducto.Nombre))
            {
                return BadRequest(new { mensaje = "El nombre del producto es obligatorio." });
            }

            nuevoProducto.Id = ListaProductos.Count > 0 ? ListaProductos.Max(p => p.Id) + 1 : 1;
            ListaProductos.Add(nuevoProducto);

            return CreatedAtAction(nameof(ObtenerProductoPorId), new { id = nuevoProducto.Id }, nuevoProducto);
        }

        // 4. PUT: api/productos/{id}
        // Edita los datos de un producto existente
        [HttpPut("{id}")]
        public ActionResult<Producto> ActualizarProducto(int id, [FromBody] Producto productoActualizado)
        {
            var producto = ListaProductos.FirstOrDefault(p => p.Id == id);
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

        // 5. PUT: api/productos/{id}/estado
        // Activa o desactiva un producto en el inventario
        [HttpPut("{id}/estado")]
        public ActionResult<Producto> CambiarEstadoProducto(int id)
        {
            var producto = ListaProductos.FirstOrDefault(p => p.Id == id);
            if (producto == null)
            {
                return NotFound(new { mensaje = "Producto no encontrado" });
            }

            producto.Activo = !producto.Activo;
            return Ok(producto);
        }
    }
}
