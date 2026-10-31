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
        Activo BIT NOT NULL DEFAULT 1
    );
END
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

-- 4. TABLA DE RECARGAS TELEFÓNICAS (TIGO / CLARO)
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
        Total DECIMAL(18,2) NOT NULL
    );
END
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
    INSERT INTO Productos (Nombre, Descripcion, Categoria, Precio, UnidadMedida, Existencia, Activo) VALUES
    ('Arroz rio pelon', 'Arroz tipo grano azul', 'Abarrotes', 23.00, 'Libra', 88.5, 1),
    ('Azucar libreada', 'Sin descripcion', 'Abarrotes', 16.00, 'Libra', 97.0, 1),
    ('Cafe presto 400 g', 'Cafe instantaneo', 'Abarrotes', 200.00, 'Unidad', 23.0, 1),
    ('Coca Cola retornable 2 Lt', 'Bebida gaseosa', 'Bebidas', 48.00, 'Unidad', 23.0, 1),
    ('Papel Higienico', 'Rollo individual', 'Aseo personal', 18.00, 'Unidad', 30.0, 1),
    ('Agua embotellada 1 Lt', 'Agua purificada', 'Bebidas', 20.00, 'Unidad', 40.0, 1);
END
GO
