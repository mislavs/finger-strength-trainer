using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.Protocols.Queries.GetProtocol;

public record GetProtocolQuery(Guid Id) : IRequest<ProtocolDto>;

public class GetProtocolHandler(AppDbContext dbContext) : IRequestHandler<GetProtocolQuery, ProtocolDto>
{
    public async Task<ProtocolDto> Handle(GetProtocolQuery request, CancellationToken cancellationToken)
    {
        var protocol = await dbContext.Protocols
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new ProtocolDto(
                x.Id,
                x.Name,
                x.MaxWeightKg,
                x.WeightPercentage,
                x.RepsPerSet,
                x.NumberOfSets,
                x.WorkSeconds,
                x.RestSeconds,
                x.HandSwitchSeconds,
                x.SetRestSeconds,
                x.CountdownSeconds,
                x.AudioCues,
                x.CountdownBeeps,
                x.IsDefault,
                x.TargetWeightKg))
            .FirstOrDefaultAsync(cancellationToken);

        if (protocol is null)
        {
            throw new NotFoundException($"Protocol with id '{request.Id}' was not found.");
        }

        return protocol;
    }
}
