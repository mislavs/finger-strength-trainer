using MediatR;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.RepeaterProtocols.Commands.CreateRepeaterProtocol;

public record CreateRepeaterProtocolCommand(
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
    bool CountdownBeeps) : IRequest<Guid>;

public class CreateRepeaterProtocolHandler(AppDbContext dbContext) : IRequestHandler<CreateRepeaterProtocolCommand, Guid>
{
    public async Task<Guid> Handle(CreateRepeaterProtocolCommand request, CancellationToken cancellationToken)
    {
        var protocol = RepeaterProtocol.Create(
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

        dbContext.RepeaterProtocols.Add(protocol);
        await dbContext.SaveChangesAsync(cancellationToken);

        return protocol.Id;
    }
}
