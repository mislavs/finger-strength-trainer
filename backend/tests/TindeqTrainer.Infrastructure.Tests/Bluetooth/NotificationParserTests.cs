using System.Buffers.Binary;
using System.Text;
using FluentAssertions;
using TindeqTrainer.Infrastructure.Bluetooth;

namespace TindeqTrainer.Infrastructure.Tests.Bluetooth;

public class NotificationParserTests
{
    [Fact]
    public void ParseTlv_WhenNotificationIsValid_ReturnsPayload()
    {
        var payload = "2.3.1"u8.ToArray();
        var notification = new byte[2 + payload.Length];
        notification[0] = 0x00;
        notification[1] = (byte)payload.Length;
        payload.CopyTo(notification.AsSpan(2));

        var (responseCode, parsedPayload) = NotificationParser.ParseTlv(notification);

        responseCode.Should().Be(0x00);
        parsedPayload.Should().Equal(payload);
    }

    [Fact]
    public void ParseTlv_WhenFrameIsTruncated_ReturnsEmptyPayload()
    {
        byte[] notification = [0x01, 0x08, 0x01, 0x02, 0x03];

        var (responseCode, parsedPayload) = NotificationParser.ParseTlv(notification);

        responseCode.Should().Be(0x01);
        parsedPayload.Should().BeEmpty();
    }

    [Fact]
    public void ParseWeightSamples_WhenSingleSample_ParsesCorrectly()
    {
        var payload = new byte[8];
        var weightBits = BitConverter.SingleToInt32Bits(12.34f);
        BinaryPrimitives.WriteInt32LittleEndian(payload.AsSpan(0, 4), weightBits);
        BinaryPrimitives.WriteUInt32LittleEndian(payload.AsSpan(4, 4), 1_250_000u);

        var samples = NotificationParser.ParseWeightSamples(payload);

        samples.Should().HaveCount(1);
        samples[0].WeightKg.Should().BeApproximately(12.34f, 0.001f);
        samples[0].TimestampSeconds.Should().BeApproximately(1.25d, 0.0001d);
    }

    [Fact]
    public void ParseWeightSamples_WhenPayloadHasTrailingBytes_IgnoresPartialSample()
    {
        var payload = new byte[11];
        var weightBits = BitConverter.SingleToInt32Bits(6.5f);
        BinaryPrimitives.WriteInt32LittleEndian(payload.AsSpan(0, 4), weightBits);
        BinaryPrimitives.WriteUInt32LittleEndian(payload.AsSpan(4, 4), 500_000u);
        payload[8] = 0xFF;
        payload[9] = 0xAB;
        payload[10] = 0x10;

        var samples = NotificationParser.ParseWeightSamples(payload);

        samples.Should().HaveCount(1);
        samples[0].WeightKg.Should().BeApproximately(6.5f, 0.001f);
        samples[0].TimestampSeconds.Should().BeApproximately(0.5d, 0.0001d);
    }

    [Fact]
    public void ParseBatteryVoltage_WhenValidPayload_ConvertsMillivoltsToVolts()
    {
        var payload = new byte[4];
        BinaryPrimitives.WriteUInt32LittleEndian(payload, 3_910u);

        var voltage = NotificationParser.ParseBatteryVoltage(payload);

        voltage.Should().BeApproximately(3.91f, 0.001f);
    }

    [Fact]
    public void ParseFirmwareVersion_WhenValidPayload_DecodesUtf8String()
    {
        var payload = "2.6.0-beta"u8.ToArray();

        var firmwareVersion = NotificationParser.ParseFirmwareVersion(payload);

        firmwareVersion.Should().Be("2.6.0-beta");
    }
}
