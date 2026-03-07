using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.Protocols.Queries.ListProtocols;

public record ListProtocolsQuery : IRequest<List<ProtocolSummaryDto>>;

public class ListProtocolsHandler(AppDbContext dbContext) : IRequestHandler<ListProtocolsQuery, List<ProtocolSummaryDto>>
{
    public Task<List<ProtocolSummaryDto>> Handle(ListProtocolsQuery request, CancellationToken cancellationToken)
    {
        return dbContext.Protocols
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ProtocolSummaryDto(
                x.Id,
                x.Name,
                x.WeightPercentage,
                x.RepsPerSet,
                x.NumberOfSets,
                x.WorkSeconds,
                x.IsDefault))
            .ToListAsync(cancellationToken);
    }
}
