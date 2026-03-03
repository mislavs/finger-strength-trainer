using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Infrastructure.Persistence.EntityConfigurations;

public class SessionSampleConfiguration : IEntityTypeConfiguration<SessionSample>
{
    public void Configure(EntityTypeBuilder<SessionSample> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Hand)
            .HasMaxLength(16);

        builder.Property(s => s.WeightKg)
            .IsRequired();

        builder.Property(s => s.TimestampSeconds)
            .IsRequired();

        builder.HasIndex(s => s.SessionId);

        builder.HasOne(s => s.Session)
            .WithMany(s => s.Samples)
            .HasForeignKey(s => s.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
