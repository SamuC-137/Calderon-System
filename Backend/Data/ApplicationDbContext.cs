using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data
{
    /// <summary>
    /// Contexto de Base de Datos de Entity Framework Core para Microsoft SQL Server
    /// </summary>
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // Tablas en Microsoft SQL Server
        public DbSet<Producto> Productos { get; set; }
        public DbSet<EntradaInventario> EntradasInventario { get; set; }
        public DbSet<SalidaInventario> SalidasInventario { get; set; }
        public DbSet<Recarga> Recargas { get; set; }
        public DbSet<Venta> Ventas { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuración de precisión decimal para precios y cantidades en SQL Server
            modelBuilder.Entity<Producto>().Property(p => p.Precio).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Producto>().Property(p => p.Existencia).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<EntradaInventario>().Property(e => e.Cantidad).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<SalidaInventario>().Property(s => s.Cantidad).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Recarga>().Property(r => r.Monto).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Venta>().Property(v => v.Total).HasColumnType("decimal(18,2)");
        }
    }
}
