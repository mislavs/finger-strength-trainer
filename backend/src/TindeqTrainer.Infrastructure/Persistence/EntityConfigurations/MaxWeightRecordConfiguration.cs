using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Infrastructure.Persistence.EntityConfigurations;

public class MaxWeightRecordConfiguration : IEntityTypeConfiguration<MaxWeightRecord>
{
    public void Configure(EntityTypeBuilder<MaxWeightRecord> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.LeftWeightKg);

        builder.Property(x => x.RightWeightKg);

        builder.Property(x => x.RecordedAt)
            .HasColumnType("TEXT")
            .IsRequired();

        builder.HasIndex(x => x.RecordedAt);
    }
}
