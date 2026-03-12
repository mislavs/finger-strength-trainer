using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Application.Services;

public interface IConnectionNotifier
{
    Task SendConnectionLostAsync();

    Task SendReconnectedAsync(DeviceStatusDto status);

    Task SendReconnectionFailedAsync();
}
