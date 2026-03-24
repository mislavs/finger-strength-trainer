using MediatR;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.MaxWeights.Commands.CreateMaxWeightRecord;

public record CreateMaxWeightRecordCommand(
    double? LeftWeightKg,
    double? RightWeightKg,
    DateTime? RecordedAt) : IRequest<Guid>;

public class CreateMaxWeightRecordHandler(AppDbContext dbContext) : IRequestHandler<CreateMaxWeightRecordCommand, Guid>
{
    public async Task<Guid> Handle(CreateMaxWeightRecordCommand request, CancellationToken cancellationToken)
    {
        var record = MaxWeightRecord.Create(request.LeftWeightKg, request.RightWeightKg, request.RecordedAt);

        dbContext.MaxWeightRecords.Add(record);
        await dbContext.SaveChangesAsync(cancellationToken);

        return record.Id;
    }
}
