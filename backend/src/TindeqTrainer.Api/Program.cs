using TindeqTrainer.Api.Endpoints;
using TindeqTrainer.Api.Hubs;
using TindeqTrainer.Api.Middleware;
using TindeqTrainer.Application;
using TindeqTrainer.Infrastructure;
using TindeqTrainer.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);

builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("Frontend");
}

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}

app.UseMiddleware<ExceptionHandlerMiddleware>();
app.UseHttpsRedirection();

app.MapHub<TrainingHub>("/hubs/training");
app.MapProtocolEndpoints();

app.MapGet("/", () => Results.Ok("TindeqTrainer API is running."));
app.MapDefaultEndpoints();

app.Run();

public partial class Program;
