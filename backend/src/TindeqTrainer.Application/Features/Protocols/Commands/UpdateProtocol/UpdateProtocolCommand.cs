using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.Protocols.Commands.UpdateProtocol;

public record UpdateProtocolCommand(
    Guid Id,
    string Name,
    double WeightPercentage,
    int RepsPerSet,
    int NumberOfSets,
    double WorkSeconds,
    double RestSeconds,
    double HandSwitchSeconds,
    double SetRestSeconds,
    double CountdownSeconds,
    bool AudioCues,
    bool CountdownBeeps) : IRequest;

public class UpdateProtocolHandler(AppDbContext dbContext) : IRequestHandler<UpdateProtocolCommand>
{
    public async Task Handle(UpdateProtocolCommand request, CancellationToken cancellationToken)
    {
        var protocol = await dbContext.Protocols
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (protocol is null)
        {
            throw new NotFoundException($"Protocol with id '{request.Id}' was not found.");
        }

        protocol.Update(
            request.Name,
            request.WeightPercentage,
            request.RepsPerSet,
            request.NumberOfSets,
            request.WorkSeconds,
            request.RestSeconds,
            request.HandSwitchSeconds,
            request.SetRestSeconds,
            request.CountdownSeconds,
            request.AudioCues,
            request.CountdownBeeps);

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
