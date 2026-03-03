using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.Protocols.Commands.DeleteProtocol;

public record DeleteProtocolCommand(Guid Id) : IRequest;

public class DeleteProtocolHandler(AppDbContext dbContext) : IRequestHandler<DeleteProtocolCommand>
{
    public async Task Handle(DeleteProtocolCommand request, CancellationToken cancellationToken)
    {
        var protocol = await dbContext.Protocols
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (protocol is null)
        {
            throw new NotFoundException($"Protocol with id '{request.Id}' was not found.");
        }

        dbContext.Protocols.Remove(protocol);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
