var builder = WebApplication.CreateBuilder(args);

// 1. Habilitar CORS para que tu Frontend (HTML/CSS/JS) pueda hacer peticiones fetch() sin bloqueos
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// 2. Registrar los Controladores (donde vivirán tus funciones en C#)
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// 3. Activar la política de CORS antes de Authorization
app.UseCors("PermitirFrontend");

app.UseAuthorization();

app.MapControllers();

app.Run();
