using FluentAssertions;
using TindeqTrainer.Infrastructure.Bluetooth;

namespace TindeqTrainer.Infrastructure.Tests.Bluetooth;

public class MockProgressorServiceTests
{
    [Fact]
    public async Task ConnectAndDisconnect_ShouldRaiseConnectionStatusEvents()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var service = new MockProgressorService();
        var statusTransitions = new List<bool>();
        service.ConnectionStatusChanged += isConnected => statusTransitions.Add(isConnected);

        await service.ConnectAsync(cancellationToken);
        await service.DisconnectAsync();

        statusTransitions.Should().Equal(true, false);
    }

    [Fact]
    public async Task StartMeasurement_ShouldEmitSampleBatches()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var service = new MockProgressorService();
        var firstBatch = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        service.SamplesReceived += samples =>
        {
            if (samples.Length > 0)
            {
                firstBatch.TrySetResult(true);
            }
        };

        await service.ConnectAsync(cancellationToken);
        await service.StartMeasurementAsync(cancellationToken);

        var completedTask = await Task.WhenAny(firstBatch.Task, Task.Delay(TimeSpan.FromSeconds(2), cancellationToken));

        completedTask.Should().Be(firstBatch.Task);
        (await firstBatch.Task).Should().BeTrue();
    }

    [Fact]
    public async Task StopMeasurement_ShouldStopFurtherSampleEmission()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var service = new MockProgressorService();
        var sampleBatchCount = 0;
        service.SamplesReceived += _ => Interlocked.Increment(ref sampleBatchCount);

        await service.ConnectAsync(cancellationToken);
        await service.StartMeasurementAsync(cancellationToken);
        await Task.Delay(TimeSpan.FromMilliseconds(400), cancellationToken);

        await service.StopMeasurementAsync(cancellationToken);
        var countAfterStop = sampleBatchCount;

        await Task.Delay(TimeSpan.FromMilliseconds(300), cancellationToken);

        sampleBatchCount.Should().Be(countAfterStop);
    }
}
