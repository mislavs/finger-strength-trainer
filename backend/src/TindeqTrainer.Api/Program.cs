using Microsoft.AspNetCore.SignalR;
using Serilog;
using TindeqTrainer.Api.Endpoints;
using TindeqTrainer.Api.ExceptionHandlers;
using TindeqTrainer.Api.Hubs;
using TindeqTrainer.Api.Services;
using TindeqTrainer.Application;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Infrastructure;
using TindeqTrainer.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) =>
        configuration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services));

    builder.AddServiceDefaults();

    builder.Services
        .AddApplication()
        .AddInfrastructure(builder.Configuration);

    var signalRBuilder = builder.Services.AddSignalR(options =>
    {
        if (builder.Environment.IsDevelopment())
        {
            options.EnableDetailedErrors = true;
        }
    });
    signalRBuilder.AddHubOptions<TrainingHub>(options =>
    {
        options.AddFilter<HubExceptionFilter>();
    });
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
    builder.Services.AddProblemDetails();
    builder.Services.AddSingleton<IConnectionNotifier, SignalRConnectionNotifier>();
    builder.Services.AddSingleton<ILiveStreamNotifier, SignalRLiveStreamNotifier>();
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

    await using (var scope = app.Services.CreateAsyncScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();
    }

    app.UseExceptionHandler();
    app.UseSerilogRequestLogging();

    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }

    app.MapHub<TrainingHub>("/hubs/training");
    app.MapDeviceEndpoints();
    app.MapMaxWeightEndpoints();
    app.MapRepeaterProtocolEndpoints();
    app.MapWorkoutProtocolEndpoints();


    app.MapGet("/", () => Results.Ok("TindeqTrainer API is running."));
    app.MapDefaultEndpoints();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program;
