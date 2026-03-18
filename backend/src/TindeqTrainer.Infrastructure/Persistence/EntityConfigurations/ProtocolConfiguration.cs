using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Infrastructure.Persistence.EntityConfigurations;

public class ProtocolConfiguration : IEntityTypeConfiguration<Protocol>
{
    public void Configure(EntityTypeBuilder<Protocol> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(p => p.WeightPercentage)
            .IsRequired();

        builder.Property(p => p.RepsPerSet)
            .IsRequired();

        builder.Property(p => p.NumberOfSets)
            .IsRequired();

        builder.Property(p => p.WorkSeconds)
            .IsRequired();

        builder.Property(p => p.RestSeconds)
            .IsRequired();

        builder.Property(p => p.HandSwitchSeconds)
            .IsRequired();

        builder.Property(p => p.SetRestSeconds)
            .IsRequired();

        builder.Property(p => p.CountdownSeconds)
            .IsRequired();

        builder.Property(p => p.AudioCues)
            .IsRequired();

        builder.Property(p => p.CountdownBeeps)
            .IsRequired();
    }
}
