using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> _options) : DbContext(_options)
{
    private static readonly Guid MaxRepeatersProtocolId = new("664101f7-7dcd-4fb4-94f5-61e7f80c6ef0");
    private static readonly Guid EnduranceProtocolId = new("2cf4e16b-c3a7-4dfa-8944-b1d6b2384f89");
    private static readonly Guid ShortPowerProtocolId = new("d53a3ea5-d9bf-43a6-8ff8-e8f7c7f07f0a");

    public DbSet<Protocol> Protocols => Set<Protocol>();

    public DbSet<Session> Sessions => Set<Session>();

    public DbSet<SessionSample> SessionSamples => Set<SessionSample>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        modelBuilder.Entity<Protocol>().HasData(
            new
            {
                Id = MaxRepeatersProtocolId,
                Name = "Max Repeaters 80%",
                MaxWeightKg = 0d,
                WeightPercentage = 80d,
                RepsPerSet = 6,
                NumberOfSets = 1,
                WorkSeconds = 7d,
                RestSeconds = 3d,
                HandSwitchSeconds = 30d,
                SetRestSeconds = 0d,
                CountdownSeconds = 5d,
                AudioCues = true,
                CountdownBeeps = true,
                IsDefault = true
            },
            new
            {
                Id = EnduranceProtocolId,
                Name = "Endurance 60%",
                MaxWeightKg = 0d,
                WeightPercentage = 60d,
                RepsPerSet = 10,
                NumberOfSets = 1,
                WorkSeconds = 7d,
                RestSeconds = 3d,
                HandSwitchSeconds = 30d,
                SetRestSeconds = 0d,
                CountdownSeconds = 5d,
                AudioCues = true,
                CountdownBeeps = true,
                IsDefault = true
            },
            new
            {
                Id = ShortPowerProtocolId,
                Name = "Short Power 90%",
                MaxWeightKg = 0d,
                WeightPercentage = 90d,
                RepsPerSet = 4,
                NumberOfSets = 1,
                WorkSeconds = 5d,
                RestSeconds = 5d,
                HandSwitchSeconds = 30d,
                SetRestSeconds = 0d,
                CountdownSeconds = 5d,
                AudioCues = true,
                CountdownBeeps = true,
                IsDefault = true
            });
    }
}
