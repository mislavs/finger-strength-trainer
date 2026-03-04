using Microsoft.AspNetCore.Http.HttpResults;
using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Api.Endpoints;

public static class DeviceEndpoints
{
    public static void MapDeviceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/device")
            .WithTags("Device");

        group.MapGet("/status", GetStatus)
            .WithName("GetDeviceStatus")
            .Produces<DeviceStatusDto>();
    }

    private static Ok<DeviceStatusDto> GetStatus(IProgressorService progressorService)
    {
        return TypedResults.Ok(new DeviceStatusDto(
            progressorService.IsConnected,
            progressorService.DeviceName,
            progressorService.BatteryVoltage,
            progressorService.FirmwareVersion));
    }
}
