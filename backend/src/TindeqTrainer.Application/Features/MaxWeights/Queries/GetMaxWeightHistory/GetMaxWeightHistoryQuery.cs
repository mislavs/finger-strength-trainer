using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.MaxWeights.Queries.GetMaxWeightHistory;

public record GetMaxWeightHistoryQuery : IRequest<List<MaxWeightRecordDto>>;

public class GetMaxWeightHistoryHandler(AppDbContext dbContext) : IRequestHandler<GetMaxWeightHistoryQuery, List<MaxWeightRecordDto>>
{
    public async Task<List<MaxWeightRecordDto>> Handle(GetMaxWeightHistoryQuery request, CancellationToken cancellationToken)
    {
        return await dbContext.MaxWeightRecords
            .AsNoTracking()
            .OrderByDescending(x => x.RecordedAt)
            .Take(200)
            .Select(x => new MaxWeightRecordDto(
                x.Id,
                x.LeftWeightKg,
                x.RightWeightKg,
                x.RecordedAt))
            .ToListAsync(cancellationToken);
    }
}
