using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.RepeaterProtocols.Queries.GetRepeaterProtocol;

public record GetRepeaterProtocolQuery(Guid Id) : IRequest<RepeaterProtocolDto>;

public class GetRepeaterProtocolHandler(AppDbContext dbContext) : IRequestHandler<GetRepeaterProtocolQuery, RepeaterProtocolDto>
{
    public async Task<RepeaterProtocolDto> Handle(GetRepeaterProtocolQuery request, CancellationToken cancellationToken)
    {
        var protocol = await dbContext.RepeaterProtocols
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new RepeaterProtocolDto(
                x.Id,
                x.Name,
                x.WeightPercentage,
                x.RepsPerSet,
                x.NumberOfSets,
                x.WorkSeconds,
                x.RestSeconds,
                x.HandSwitchSeconds,
                x.SetRestSeconds,
                x.CountdownSeconds,
                x.AudioCues,
                x.CountdownBeeps))
            .FirstOrDefaultAsync(cancellationToken);

        if (protocol is null)
        {
            throw new NotFoundException($"Repeater protocol with id '{request.Id}' was not found.");
        }

        return protocol;
    }
}
