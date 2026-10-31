namespace Backend.Models
{
    public class EntradaInventario
    {
        public int Id { get; set; }
        public int ProductoId { get; set; }
        public string ProductoNombre { get; set; } = string.Empty;
        public string UnidadMedida { get; set; } = "Unidad";
        public decimal Cantidad { get; set; }
        public string MotivoCodigo { get; set; } = string.Empty;
        public string MotivoTexto { get; set; } = string.Empty;
        public string IngresadoPor { get; set; } = "—";
        public string Fecha { get; set; } = string.Empty;
    }
}
