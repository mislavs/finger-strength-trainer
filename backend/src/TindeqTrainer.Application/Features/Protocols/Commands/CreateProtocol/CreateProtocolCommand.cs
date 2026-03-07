using MediatR;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.Protocols.Commands.CreateProtocol;

public record CreateProtocolCommand(
    string Name,
    double MaxWeightKg,
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

public class CreateProtocolHandler(AppDbContext dbContext) : IRequestHandler<CreateProtocolCommand, Guid>
{
    public async Task<Guid> Handle(CreateProtocolCommand request, CancellationToken cancellationToken)
    {
        var protocol = Protocol.Create(
            request.Name,
            request.MaxWeightKg,
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

        dbContext.Protocols.Add(protocol);
        await dbContext.SaveChangesAsync(cancellationToken);

        return protocol.Id;
    }
}
