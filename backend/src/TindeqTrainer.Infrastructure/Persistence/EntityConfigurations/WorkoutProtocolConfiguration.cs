using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Infrastructure.Persistence.EntityConfigurations;

public class WorkoutProtocolConfiguration : IEntityTypeConfiguration<WorkoutProtocol>
{
    public void Configure(EntityTypeBuilder<WorkoutProtocol> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .HasMaxLength(150)
            .IsRequired();

        builder.HasMany(x => x.Items)
            .WithOne()
            .HasForeignKey(x => x.WorkoutProtocolId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(x => x.Items)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
