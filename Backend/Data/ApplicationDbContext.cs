using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // Tablas de la base de datos.
        public DbSet<Producto> Productos { get; set; }
        public DbSet<EntradaInventario> EntradasInventario { get; set; }
        public DbSet<SalidaInventario> SalidasInventario { get; set; }
        public DbSet<Recarga> Recargas { get; set; }
        public DbSet<Venta> Ventas { get; set; }
        public DbSet<DetalleVenta> DetallesVenta { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuracion de las tablas.
            modelBuilder.Entity<Producto>().ToTable("Productos");
            modelBuilder.Entity<EntradaInventario>().ToTable("EntradasInventario");
            modelBuilder.Entity<SalidaInventario>().ToTable("SalidasInventario");
            modelBuilder.Entity<Recarga>().ToTable("Recargas");
            modelBuilder.Entity<Venta>().ToTable("Ventas");
            modelBuilder.Entity<DetalleVenta>().ToTable("DetallesVenta");

            // Configuracion de valores decimales.
            modelBuilder.Entity<Producto>()
                .Property(p => p.Precio).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Producto>()
                .Property(p => p.Existencia).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<EntradaInventario>()
                .Property(e => e.Cantidad).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<SalidaInventario>()
                .Property(s => s.Cantidad).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Recarga>()
                .Property(r => r.Monto).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Venta>()
                .Property(v => v.Total).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Venta>()
                .Property(v => v.MontoRecibido).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Venta>()
                .Property(v => v.Cambio).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<DetalleVenta>()
                .Property(d => d.PrecioUnitario).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<DetalleVenta>()
                .Property(d => d.Cantidad).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<DetalleVenta>()
                .Property(d => d.Subtotal).HasColumnType("decimal(18,2)");

            // Relacion: una venta puede tener varios detalles.
            modelBuilder.Entity<DetalleVenta>()
                .HasOne<Venta>()
                .WithMany(v => v.Detalles)
                .HasForeignKey(d => d.VentaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Relacion: cada detalle pertenece a un producto.
            modelBuilder.Entity<DetalleVenta>()
                .HasOne<Producto>()
                .WithMany()
                .HasForeignKey(d => d.ProductoId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
