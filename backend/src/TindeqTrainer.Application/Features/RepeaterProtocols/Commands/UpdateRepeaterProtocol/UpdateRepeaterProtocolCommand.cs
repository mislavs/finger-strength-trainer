using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.RepeaterProtocols.Commands.UpdateRepeaterProtocol;

public record UpdateRepeaterProtocolCommand(
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

public class UpdateRepeaterProtocolHandler(AppDbContext dbContext) : IRequestHandler<UpdateRepeaterProtocolCommand>
{
    public async Task Handle(UpdateRepeaterProtocolCommand request, CancellationToken cancellationToken)
    {
        var protocol = await dbContext.RepeaterProtocols
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (protocol is null)
        {
            throw new NotFoundException($"Repeater protocol with id '{request.Id}' was not found.");
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
