using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.Sessions.Commands.DeleteSession;

public record DeleteSessionCommand(Guid Id) : IRequest;

public class DeleteSessionHandler(AppDbContext dbContext) : IRequestHandler<DeleteSessionCommand>
{
    public async Task Handle(DeleteSessionCommand request, CancellationToken cancellationToken)
    {
        var session = await dbContext.Sessions
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (session is null)
        {
            throw new NotFoundException($"Session with id '{request.Id}' was not found.");
        }

        dbContext.Sessions.Remove(session);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
