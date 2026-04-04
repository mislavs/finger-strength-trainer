using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Infrastructure.Persistence.EntityConfigurations;

public class WorkoutProtocolItemConfiguration : IEntityTypeConfiguration<WorkoutProtocolItem>
{
    public void Configure(EntityTypeBuilder<WorkoutProtocolItem> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.RepeaterProtocolId)
            .IsRequired();

        builder.Property(x => x.SortOrder)
            .IsRequired();

        builder.Property(x => x.Repetitions)
            .IsRequired();

        builder.Property(x => x.RestAfterSeconds)
            .IsRequired();

        builder.HasOne(x => x.RepeaterProtocol)
            .WithMany()
            .HasForeignKey(x => x.RepeaterProtocolId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.WorkoutProtocolId, x.SortOrder })
            .IsUnique();
    }
}
