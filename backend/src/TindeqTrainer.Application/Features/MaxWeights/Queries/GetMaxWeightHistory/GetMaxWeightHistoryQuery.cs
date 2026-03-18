using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Enums;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.MaxWeights.Queries.GetMaxWeightHistory;

public record GetMaxWeightHistoryQuery(Hand? Hand = null) : IRequest<List<MaxWeightRecordDto>>;

public class GetMaxWeightHistoryHandler(AppDbContext dbContext) : IRequestHandler<GetMaxWeightHistoryQuery, List<MaxWeightRecordDto>>
{
    public async Task<List<MaxWeightRecordDto>> Handle(GetMaxWeightHistoryQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.MaxWeightRecords
            .AsNoTracking();

        if (request.Hand is not null)
        {
            query = query.Where(x => x.Hand == request.Hand);
        }

        return await query
            .OrderByDescending(x => x.RecordedAt)
            .Take(200)
            .Select(x => new MaxWeightRecordDto(
                x.Id,
                x.Hand.ToString(),
                x.WeightKg,
                x.RecordedAt))
            .ToListAsync(cancellationToken);
    }
}
