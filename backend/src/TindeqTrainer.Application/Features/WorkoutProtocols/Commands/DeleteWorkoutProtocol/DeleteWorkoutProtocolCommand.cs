using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.WorkoutProtocols.Commands.DeleteWorkoutProtocol;

public record DeleteWorkoutProtocolCommand(Guid Id) : IRequest;

public class DeleteWorkoutProtocolHandler(AppDbContext dbContext)
    : IRequestHandler<DeleteWorkoutProtocolCommand>
{
    public async Task Handle(DeleteWorkoutProtocolCommand request, CancellationToken cancellationToken)
    {
        var workoutProtocol = await dbContext.WorkoutProtocols
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (workoutProtocol is null)
        {
            throw new NotFoundException($"Workout protocol with id '{request.Id}' was not found.");
        }

        dbContext.WorkoutProtocols.Remove(workoutProtocol);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
