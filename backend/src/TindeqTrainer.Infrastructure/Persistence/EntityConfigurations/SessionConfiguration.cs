using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Infrastructure.Persistence.EntityConfigurations;

public class SessionConfiguration : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Date)
            .IsRequired();

        builder.Property(s => s.Type)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(s => s.ProtocolName)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(s => s.IsComplete)
            .IsRequired();

        builder.Property(s => s.PeakForceKg)
            .IsRequired();

        builder.Property(s => s.AvgForceKg)
            .IsRequired();

        builder.Property(s => s.DurationSeconds)
            .IsRequired();

        builder.HasOne(s => s.Protocol)
            .WithMany()
            .HasForeignKey(s => s.ProtocolId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
