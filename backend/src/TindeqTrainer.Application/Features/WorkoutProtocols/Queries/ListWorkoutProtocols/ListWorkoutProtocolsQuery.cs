using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.WorkoutProtocols.Queries.ListWorkoutProtocols;

public record ListWorkoutProtocolsQuery : IRequest<List<WorkoutProtocolSummaryDto>>;

public class ListWorkoutProtocolsHandler(AppDbContext dbContext)
    : IRequestHandler<ListWorkoutProtocolsQuery, List<WorkoutProtocolSummaryDto>>
{
    public Task<List<WorkoutProtocolSummaryDto>> Handle(ListWorkoutProtocolsQuery request, CancellationToken cancellationToken)
    {
        return dbContext.WorkoutProtocols
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new WorkoutProtocolSummaryDto(
                x.Id,
                x.Name,
                x.Items.Count,
                x.Items.Sum(item => item.Repetitions)))
            .ToListAsync(cancellationToken);
    }
}
