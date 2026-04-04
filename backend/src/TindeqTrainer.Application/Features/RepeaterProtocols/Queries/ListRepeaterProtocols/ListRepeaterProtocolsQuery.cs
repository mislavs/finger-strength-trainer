using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.RepeaterProtocols.Queries.ListRepeaterProtocols;

public record ListRepeaterProtocolsQuery : IRequest<List<RepeaterProtocolSummaryDto>>;

public class ListRepeaterProtocolsHandler(AppDbContext dbContext) : IRequestHandler<ListRepeaterProtocolsQuery, List<RepeaterProtocolSummaryDto>>
{
    public Task<List<RepeaterProtocolSummaryDto>> Handle(ListRepeaterProtocolsQuery request, CancellationToken cancellationToken)
    {
        return dbContext.RepeaterProtocols
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new RepeaterProtocolSummaryDto(
                x.Id,
                x.Name,
                x.WeightPercentage,
                x.RepsPerSet,
                x.NumberOfSets,
                x.WorkSeconds))
            .ToListAsync(cancellationToken);
    }
}
