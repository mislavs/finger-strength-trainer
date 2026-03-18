using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Infrastructure.Persistence.EntityConfigurations;

public class MaxWeightRecordConfiguration : IEntityTypeConfiguration<MaxWeightRecord>
{
    public void Configure(EntityTypeBuilder<MaxWeightRecord> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Hand)
            .HasConversion<string>()
            .HasMaxLength(16)
            .IsRequired();

        builder.Property(x => x.WeightKg)
            .IsRequired();

        builder.Property(x => x.RecordedAt)
            .HasColumnType("TEXT")
            .IsRequired();

        builder.HasIndex(x => new { x.Hand, x.RecordedAt });
    }
}
