using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.MaxWeights.Queries.GetCurrentMaxWeights;

public record GetCurrentMaxWeightsQuery : IRequest<CurrentMaxWeightsDto>;

public class GetCurrentMaxWeightsHandler(AppDbContext dbContext) : IRequestHandler<GetCurrentMaxWeightsQuery, CurrentMaxWeightsDto>
{
    public async Task<CurrentMaxWeightsDto> Handle(GetCurrentMaxWeightsQuery request, CancellationToken cancellationToken)
    {
        var leftKg = await dbContext.MaxWeightRecords
            .AsNoTracking()
            .Where(x => x.LeftWeightKg != null)
            .OrderByDescending(x => x.RecordedAt)
            .Select(x => x.LeftWeightKg)
            .FirstOrDefaultAsync(cancellationToken);

        var rightKg = await dbContext.MaxWeightRecords
            .AsNoTracking()
            .Where(x => x.RightWeightKg != null)
            .OrderByDescending(x => x.RecordedAt)
            .Select(x => x.RightWeightKg)
            .FirstOrDefaultAsync(cancellationToken);

        return new CurrentMaxWeightsDto(leftKg, rightKg);
    }
}
