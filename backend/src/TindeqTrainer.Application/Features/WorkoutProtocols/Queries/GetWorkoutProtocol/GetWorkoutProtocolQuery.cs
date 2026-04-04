using MediatR;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Domain.Exceptions;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Features.WorkoutProtocols.Queries.GetWorkoutProtocol;

public record GetWorkoutProtocolQuery(Guid Id) : IRequest<WorkoutProtocolDto>;

public class GetWorkoutProtocolHandler(AppDbContext dbContext)
    : IRequestHandler<GetWorkoutProtocolQuery, WorkoutProtocolDto>
{
    public async Task<WorkoutProtocolDto> Handle(GetWorkoutProtocolQuery request, CancellationToken cancellationToken)
    {
        var protocol = await dbContext.WorkoutProtocols
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new WorkoutProtocolDto(
                x.Id,
                x.Name,
                x.Items
                    .OrderBy(item => item.SortOrder)
                    .Select(item => new WorkoutProtocolItemDto(
                        item.RepeaterProtocolId,
                        item.RepeaterProtocol.Name,
                        item.Repetitions,
                        item.RestAfterSeconds,
                        item.RepeaterProtocol.WeightPercentage,
                        item.RepeaterProtocol.RepsPerSet,
                        item.RepeaterProtocol.NumberOfSets,
                        item.RepeaterProtocol.WorkSeconds,
                        item.RepeaterProtocol.RestSeconds,
                        item.RepeaterProtocol.HandSwitchSeconds,
                        item.RepeaterProtocol.SetRestSeconds,
                        item.RepeaterProtocol.CountdownSeconds,
                        item.RepeaterProtocol.AudioCues,
                        item.RepeaterProtocol.CountdownBeeps))
                    .ToList()))
            .FirstOrDefaultAsync(cancellationToken);

        if (protocol is null)
        {
            throw new NotFoundException($"Workout protocol with id '{request.Id}' was not found.");
        }

        return protocol;
    }
}
