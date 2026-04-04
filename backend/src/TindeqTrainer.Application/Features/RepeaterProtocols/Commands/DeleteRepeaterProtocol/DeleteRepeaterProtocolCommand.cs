using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.RepeaterProtocols.Commands.DeleteRepeaterProtocol;

public record DeleteRepeaterProtocolCommand(Guid Id) : IRequest;

public class DeleteRepeaterProtocolHandler(AppDbContext dbContext) : IRequestHandler<DeleteRepeaterProtocolCommand>
{
    public async Task Handle(DeleteRepeaterProtocolCommand request, CancellationToken cancellationToken)
    {
        var protocol = await dbContext.RepeaterProtocols
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (protocol is null)
        {
            throw new NotFoundException($"Repeater protocol with id '{request.Id}' was not found.");
        }

        var isReferencedByWorkout = await dbContext.WorkoutProtocolItems
            .AnyAsync(item => item.RepeaterProtocolId == request.Id, cancellationToken);

        if (isReferencedByWorkout)
        {
            throw new ConflictException(
                $"Repeater protocol '{protocol.Name}' is used by one or more workout protocols and cannot be deleted.");
        }

        dbContext.RepeaterProtocols.Remove(protocol);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
