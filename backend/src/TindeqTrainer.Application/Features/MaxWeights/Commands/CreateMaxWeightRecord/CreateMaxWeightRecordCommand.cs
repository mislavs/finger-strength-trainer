using MediatR;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Enums;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.MaxWeights.Commands.CreateMaxWeightRecord;

public record CreateMaxWeightRecordCommand(
    Hand Hand,
    double WeightKg,
    DateTime? RecordedAt) : IRequest<Guid>;

public class CreateMaxWeightRecordHandler(AppDbContext dbContext) : IRequestHandler<CreateMaxWeightRecordCommand, Guid>
{
    public async Task<Guid> Handle(CreateMaxWeightRecordCommand request, CancellationToken cancellationToken)
    {
        var record = MaxWeightRecord.Create(request.Hand, request.WeightKg, request.RecordedAt);

        dbContext.MaxWeightRecords.Add(record);
        await dbContext.SaveChangesAsync(cancellationToken);

        return record.Id;
    }
}
