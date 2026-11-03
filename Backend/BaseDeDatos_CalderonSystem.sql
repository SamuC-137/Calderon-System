-- ============================================================================
-- SCRIPT DE BASE DE DATOS: CALDERON SYSTEM (MICROSOFT SQL SERVER)
-- Instrucciones: Abre este archivo en SQL Server Management Studio (SSMS)
-- y presiona F5 (Execute) para crear la base de datos, tablas y datos iniciales.
-- ============================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'CalderonSystemDB')
BEGIN
    CREATE DATABASE CalderonSystemDB;
END
GO

USE CalderonSystemDB;
GO

-- 1. TABLA DE PRODUCTOS (INVENTARIO)
IF OBJECT_ID('dbo.Productos', 'U') IS NULL
BEGIN
    CREATE TABLE Productos (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(120) NOT NULL,
        Descripcion NVARCHAR(250) NULL,
        Categoria NVARCHAR(80) NOT NULL,
        Precio DECIMAL(18,2) NOT NULL,
        UnidadMedida NVARCHAR(40) NOT NULL DEFAULT 'Unidad',
        Existencia DECIMAL(18,2) NOT NULL DEFAULT 0,
        FechaCaducidad NVARCHAR(30) NOT NULL DEFAULT 'No aplica',
        Activo BIT NOT NULL DEFAULT 1
    );
END
GO

IF COL_LENGTH('dbo.Productos', 'FechaCaducidad') IS NULL
    ALTER TABLE dbo.Productos ADD FechaCaducidad NVARCHAR(30) NOT NULL DEFAULT 'No aplica';
GO

-- 2. TABLA DE ENTRADAS DE INVENTARIO
IF OBJECT_ID('dbo.EntradasInventario', 'U') IS NULL
BEGIN
    CREATE TABLE EntradasInventario (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ProductoId INT NOT NULL,
        ProductoNombre NVARCHAR(120) NOT NULL,
        UnidadMedida NVARCHAR(40) NOT NULL,
        Cantidad DECIMAL(18,2) NOT NULL,
        MotivoCodigo NVARCHAR(50) NOT NULL,
        MotivoTexto NVARCHAR(100) NOT NULL,
        IngresadoPor NVARCHAR(100) NULL,
        Fecha NVARCHAR(30) NOT NULL,
        CONSTRAINT FK_Entradas_Productos FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
    );
END
GO

-- 3. TABLA DE SALIDAS DE INVENTARIO
IF OBJECT_ID('dbo.SalidasInventario', 'U') IS NULL
BEGIN
    CREATE TABLE SalidasInventario (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ProductoId INT NOT NULL,
        ProductoNombre NVARCHAR(120) NOT NULL,
        UnidadMedida NVARCHAR(40) NOT NULL,
        Cantidad DECIMAL(18,2) NOT NULL,
        MotivoCodigo NVARCHAR(50) NOT NULL,
        MotivoTexto NVARCHAR(100) NOT NULL,
        RetiradoPor NVARCHAR(100) NULL,
        Fecha NVARCHAR(30) NOT NULL,
        CONSTRAINT FK_Salidas_Productos FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
    );
END
GO

-- 4. TABLA DE RECARGAS TELEFONICAS (TIGO / CLARO)
IF OBJECT_ID('dbo.Recargas', 'U') IS NULL
BEGIN
    CREATE TABLE Recargas (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Operador NVARCHAR(30) NOT NULL,
        Origen NVARCHAR(60) NOT NULL,
        Numero NVARCHAR(30) NOT NULL,
        Monto DECIMAL(18,2) NOT NULL,
        Fecha NVARCHAR(30) NOT NULL
    );
END
GO

-- 5. TABLA DE VENTAS (ENCABEZADO DE FACTURA)
IF OBJECT_ID('dbo.Ventas', 'U') IS NULL
BEGIN
    CREATE TABLE Ventas (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        NumeroFactura NVARCHAR(20) NOT NULL,
        FechaIso NVARCHAR(20) NOT NULL,
        FechaMostrar NVARCHAR(30) NOT NULL,
        MetodoPago NVARCHAR(30) NOT NULL DEFAULT 'Efectivo',
        MontoRecibido DECIMAL(18,2) NOT NULL DEFAULT 0,
        Cambio DECIMAL(18,2) NOT NULL DEFAULT 0,
        Total DECIMAL(18,2) NOT NULL
    );
END
GO

IF COL_LENGTH('dbo.Ventas', 'MetodoPago') IS NULL
    ALTER TABLE dbo.Ventas ADD MetodoPago NVARCHAR(30) NOT NULL DEFAULT 'Efectivo';
IF COL_LENGTH('dbo.Ventas', 'MontoRecibido') IS NULL
    ALTER TABLE dbo.Ventas ADD MontoRecibido DECIMAL(18,2) NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.Ventas', 'Cambio') IS NULL
    ALTER TABLE dbo.Ventas ADD Cambio DECIMAL(18,2) NOT NULL DEFAULT 0;
GO

-- 6. TABLA DE DETALLES DE VENTA (PRODUCTOS POR FACTURA)
IF OBJECT_ID('dbo.DetallesVenta', 'U') IS NULL
BEGIN
    CREATE TABLE DetallesVenta (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        VentaId INT NOT NULL,
        ProductoId INT NOT NULL,
        ProductoNombre NVARCHAR(120) NOT NULL,
        Categoria NVARCHAR(80) NOT NULL,
        UnidadMedida NVARCHAR(40) NOT NULL,
        PrecioUnitario DECIMAL(18,2) NOT NULL,
        Cantidad DECIMAL(18,2) NOT NULL,
        Subtotal DECIMAL(18,2) NOT NULL,
        CONSTRAINT FK_DetallesVenta_Ventas FOREIGN KEY (VentaId) REFERENCES Ventas(Id) ON DELETE CASCADE,
        CONSTRAINT FK_DetallesVenta_Productos FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
    );
END
GO

-- ============================================================================
-- DATOS INICIALES DE PRUEBA (SEED DATA)
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM Productos)
BEGIN
    INSERT INTO Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, FechaCaducidad, Activo) VALUES
    ('Arroz rio pelon', 'Arroz tipo grano azul', 'Abarrotes', 23.00, 'Libra', 88.5, '2027-06-30', 1),
    ('Azucar libreada', 'Sin descripcion', 'Abarrotes', 16.00, 'Libra', 97.0, '2027-08-15', 1),
    ('Cafe presto 400 g', 'Cafe instantaneo', 'Abarrotes', 200.00, 'Unidad', 23.0, '2027-09-20', 1),
    ('Coca Cola retornable 2 Lt', 'Bebida gaseosa', 'Bebidas', 48.00, 'Unidad', 23.0, '2027-03-15', 1),
    ('Papel Higienico', 'Rollo individual', 'Aseo personal', 18.00, 'Unidad', 30.0, 'No aplica', 1),
    ('Agua embotellada 1 Lt', 'Agua purificada', 'Bebidas', 20.00, 'Unidad', 40.0, '2027-10-01', 1),
    ('Pan Bimbo Blanco Mediano', 'Pan de molde suave familiar', 'Abarrotes', 65.00, 'Paquete', 15.0, '2026-11-15', 1),
    ('Pan Bimbo Integral', 'Pan de molde integral', 'Abarrotes', 72.00, 'Paquete', 10.0, '2026-11-18', 1),
    ('Ranchitas Nacho', 'Chiveria de maiz sabor queso', 'Chiverias', 10.00, 'Bolsa', 45.0, '2027-02-15', 1),
    ('Tostadas Diana Jalapeno', 'Chiveria de maiz picante', 'Chiverias', 10.00, 'Bolsa', 35.0, '2027-01-25', 1),
    ('Meneitos Diana', 'Chiveria de maiz con queso', 'Chiverias', 10.00, 'Bolsa', 40.0, '2027-02-10', 1),
    ('Alboroto Diana', 'Palomitas de maiz acarameladas', 'Chiverias', 12.00, 'Bolsa', 30.0, '2027-01-30', 1),
    ('Galletas Chiky', 'Paquete individual con chocolate', 'Galletas', 15.00, 'Paquete', 35.0, '2027-03-10', 1),
    ('Galletas Oreo', 'Paquete de 4 galletas rellenas', 'Galletas', 15.00, 'Paquete', 40.0, '2027-04-05', 1),
    ('Leche Entera Eskimos 1 Lt', 'Leche de larga duracion', 'Lacteos', 58.00, 'Litro', 20.0, '2026-12-10', 1),
    ('Crema Pura Media Libra', 'Crema fresca pasteurizada', 'Lacteos', 42.00, 'Libra', 12.0, '2026-11-12', 1),
    ('Huevo Nacional', 'Huevo blanco fresco de granja', 'Abarrotes', 7.00, 'Unidad', 60.0, '2026-11-25', 1),
    ('Jugo Hi-C Manzana 200 ml', 'Cajita de jugo individual', 'Bebidas', 18.00, 'Unidad', 28.0, '2027-03-20', 1),
    ('Salsa Naturas Ranchera', 'Salsa de tomate condimentada 106 g', 'Abarrotes', 16.00, 'Unidad', 25.0, '2027-05-15', 1),
    ('Yogurt Vasito Eskimos', 'Yogurt de fresa 150 g', 'Lacteos', 22.00, 'Unidad', 4.0, '2026-10-20', 1);
END
GO
