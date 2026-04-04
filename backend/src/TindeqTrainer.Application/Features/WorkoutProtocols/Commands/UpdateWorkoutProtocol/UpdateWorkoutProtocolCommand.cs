using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.WorkoutProtocols.Commands.UpdateWorkoutProtocol;

public record UpdateWorkoutProtocolCommand(
    Guid Id,
    string Name,
    IReadOnlyCollection<WorkoutProtocolItemInput> Items) : IRequest;

public class UpdateWorkoutProtocolHandler(AppDbContext dbContext)
    : IRequestHandler<UpdateWorkoutProtocolCommand>
{
    public async Task Handle(UpdateWorkoutProtocolCommand request, CancellationToken cancellationToken)
    {
        var workoutProtocol = await dbContext.WorkoutProtocols
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (workoutProtocol is null)
        {
            throw new NotFoundException($"Workout protocol with id '{request.Id}' was not found.");
        }

        await EnsureRepeaterProtocolsExistAsync(request.Items, cancellationToken);

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        workoutProtocol.UpdateDetails(request.Name);

        var existingItems = await dbContext.WorkoutProtocolItems
            .Where(item => item.WorkoutProtocolId == workoutProtocol.Id)
            .ToListAsync(cancellationToken);

        dbContext.WorkoutProtocolItems.RemoveRange(existingItems);
        await dbContext.SaveChangesAsync(cancellationToken);

        var newItems = request.Items
            .Select((item, index) => Domain.Entities.WorkoutProtocolItem.Create(
                workoutProtocol.Id,
                item.RepeaterProtocolId,
                item.Repetitions,
                item.RestAfterSeconds,
                index))
            .ToList();

        await dbContext.WorkoutProtocolItems.AddRangeAsync(newItems, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
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
