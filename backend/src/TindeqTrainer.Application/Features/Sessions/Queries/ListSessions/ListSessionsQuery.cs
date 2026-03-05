using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.Sessions.Queries.ListSessions;

public record ListSessionsQuery : IRequest<List<SessionSummaryDto>>;

public class ListSessionsHandler(AppDbContext dbContext) : IRequestHandler<ListSessionsQuery, List<SessionSummaryDto>>
{
    public Task<List<SessionSummaryDto>> Handle(ListSessionsQuery request, CancellationToken cancellationToken)
    {
        return dbContext.Sessions
            .AsNoTracking()
            .OrderByDescending(x => x.Date)
            .Select(x => new SessionSummaryDto(
                x.Id,
                x.Date,
                x.Type.ToString(),
                x.ProtocolName,
                x.IsComplete,
                x.PeakForceKg,
                x.AvgForceKg,
                x.DurationSeconds))
            .ToListAsync(cancellationToken);
    }
}
