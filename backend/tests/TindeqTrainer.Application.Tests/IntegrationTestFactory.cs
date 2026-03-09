using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Respawn;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Tests;

public class IntegrationTestFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private static readonly Guid MaxRepeatersProtocolId = new("664101f7-7dcd-4fb4-94f5-61e7f80c6ef0");
    private static readonly Guid EnduranceProtocolId = new("2cf4e16b-c3a7-4dfa-8944-b1d6b2384f89");
    private static readonly Guid ShortPowerProtocolId = new("d53a3ea5-d9bf-43a6-8ff8-e8f7c7f07f0a");

    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private IServiceScope _scope = null!;
    private Respawner _respawner = null!;

    public AppDbContext DbContext { get; private set; } = null!;

    public async ValueTask ResetDatabase()
    {
        await _respawner.ResetAsync(_connection);
        await SeedStarterProtocolsAsync();
        DbContext.ChangeTracker.Clear();
    }

    public async ValueTask InitializeAsync()
    {
        await _connection.OpenAsync();

        _scope = Services.CreateScope();
        DbContext = _scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await DbContext.Database.EnsureCreatedAsync();
        await SeedStarterProtocolsAsync();

        _respawner = await Respawner.CreateAsync(
            _connection,
            new RespawnerOptions
            {
                DbAdapter = DbAdapter.Sqlite
            });
    }

    public override async ValueTask DisposeAsync()
    {
        _scope.Dispose();
        await _connection.CloseAsync();
        await _connection.DisposeAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();

            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite(_connection));
        });
    }

    private async Task SeedStarterProtocolsAsync()
    {
        if (await DbContext.Protocols.AnyAsync())
        {
            return;
        }

        var starterProtocols = new[]
        {
            Protocol.Create("Max Repeaters 80%", 0d, 80d, 6, 1, 7d, 3d, 30d, 0d, 5d, true, true, MaxRepeatersProtocolId),
            Protocol.Create("Endurance 60%", 0d, 60d, 10, 1, 7d, 3d, 30d, 0d, 5d, true, true, EnduranceProtocolId),
            Protocol.Create("Short Power 90%", 0d, 90d, 4, 1, 5d, 5d, 30d, 0d, 5d, true, true, ShortPowerProtocolId)
        };

        await DbContext.Protocols.AddRangeAsync(starterProtocols);
        await DbContext.SaveChangesAsync();
    }
}
