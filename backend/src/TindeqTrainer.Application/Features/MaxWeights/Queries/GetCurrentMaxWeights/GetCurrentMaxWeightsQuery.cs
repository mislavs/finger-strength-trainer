using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Enums;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.MaxWeights.Queries.GetCurrentMaxWeights;

public record GetCurrentMaxWeightsQuery : IRequest<CurrentMaxWeightsDto>;

public class GetCurrentMaxWeightsHandler(AppDbContext dbContext) : IRequestHandler<GetCurrentMaxWeightsQuery, CurrentMaxWeightsDto>
{
    public async Task<CurrentMaxWeightsDto> Handle(GetCurrentMaxWeightsQuery request, CancellationToken cancellationToken)
    {
        var leftKg = await dbContext.MaxWeightRecords
            .AsNoTracking()
            .Where(x => x.Hand == Hand.Left)
            .OrderByDescending(x => x.RecordedAt)
            .Select(x => (double?)x.WeightKg)
            .FirstOrDefaultAsync(cancellationToken);

        var rightKg = await dbContext.MaxWeightRecords
            .AsNoTracking()
            .Where(x => x.Hand == Hand.Right)
            .OrderByDescending(x => x.RecordedAt)
            .Select(x => (double?)x.WeightKg)
            .FirstOrDefaultAsync(cancellationToken);

        return new CurrentMaxWeightsDto(leftKg, rightKg);
    }
}
