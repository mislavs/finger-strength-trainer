using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.Sessions.Queries.GetSession;

public record GetSessionQuery(Guid Id) : IRequest<SessionDetailDto>;

public class GetSessionHandler(AppDbContext dbContext) : IRequestHandler<GetSessionQuery, SessionDetailDto>
{
    public async Task<SessionDetailDto> Handle(GetSessionQuery request, CancellationToken cancellationToken)
    {
        var session = await dbContext.Sessions
            .AsNoTracking()
            .Include(x => x.Samples)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (session is null)
        {
            throw new NotFoundException($"Session with id '{request.Id}' was not found.");
        }

        return new SessionDetailDto(
            session.Id,
            session.Date,
            session.Type.ToString(),
            session.ProtocolName,
            session.IsComplete,
            session.PeakForceKg,
            session.AvgForceKg,
            session.DurationSeconds,
            session.Samples
                .OrderBy(x => x.TimestampSeconds)
                .Select(x => new SessionSampleDto(
                    x.Hand,
                    x.SetNumber,
                    x.WeightKg,
                    x.TimestampSeconds))
                .ToList());
    }
}
