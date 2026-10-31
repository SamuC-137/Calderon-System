namespace Backend.Models
{
    public class DetalleVenta
    {
        public int Id { get; set; }
        public int VentaId { get; set; }
        public int ProductoId { get; set; }
        public string ProductoNombre { get; set; } = string.Empty;
        public string Categoria { get; set; } = string.Empty;
        public string UnidadMedida { get; set; } = "Unidad";
        public decimal PrecioUnitario { get; set; }
        public decimal Cantidad { get; set; }
        public decimal Subtotal { get; set; }
    }

    public class Venta
    {
        public int Id { get; set; }
        public string NumeroFactura { get; set; } = string.Empty;
        public string FechaIso { get; set; } = string.Empty;     // Formato yyyy-MM-dd para filtros de fecha
        public string FechaMostrar { get; set; } = string.Empty; // Formato dd/MM/yyyy HH:mm para tablas
        public decimal Total { get; set; }
        public List<DetalleVenta> Detalles { get; set; } = new List<DetalleVenta>();
    }
}
