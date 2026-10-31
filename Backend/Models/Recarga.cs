namespace Backend.Models
{
    public class Recarga
    {
        public int Id { get; set; }
        public string Operador { get; set; } = string.Empty; // "tigo" o "claro"
        public string Origen { get; set; } = string.Empty;   // "Telefono Tigo" o "Telefono Claro"
        public string Numero { get; set; } = string.Empty;
        public decimal Monto { get; set; }
        public string Fecha { get; set; } = string.Empty;
    }
}
