using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.WorkoutProtocols.Commands.CreateWorkoutProtocol;

public record CreateWorkoutProtocolCommand(
    string Name,
    IReadOnlyCollection<WorkoutProtocolItemInput> Items) : IRequest<Guid>;

public class CreateWorkoutProtocolHandler(AppDbContext dbContext)
    : IRequestHandler<CreateWorkoutProtocolCommand, Guid>
{
    public async Task<Guid> Handle(CreateWorkoutProtocolCommand request, CancellationToken cancellationToken)
    {
        await EnsureRepeaterProtocolsExistAsync(request.Items, cancellationToken);

        var workoutProtocol = WorkoutProtocol.Create(
            request.Name,
            request.Items.Select(item => (item.RepeaterProtocolId, item.Repetitions, item.RestAfterSeconds)));

        dbContext.WorkoutProtocols.Add(workoutProtocol);
        await dbContext.SaveChangesAsync(cancellationToken);

        return workoutProtocol.Id;
    }

    private async Task EnsureRepeaterProtocolsExistAsync(
        IReadOnlyCollection<WorkoutProtocolItemInput> items,
        CancellationToken cancellationToken)
    {
        var requestedIds = items
            .Select(item => item.RepeaterProtocolId)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (requestedIds.Count == 0)
        {
            throw new NotFoundException("No valid repeater protocol ids were provided.");
        }

        var existingIds = await dbContext.RepeaterProtocols
            .Where(protocol => requestedIds.Contains(protocol.Id))
            .Select(protocol => protocol.Id)
            .ToListAsync(cancellationToken);

        var missingIds = requestedIds.Except(existingIds).ToList();
        if (missingIds.Count > 0)
        {
            throw new NotFoundException($"Repeater protocol with id '{missingIds[0]}' was not found.");
        }
    }
}
