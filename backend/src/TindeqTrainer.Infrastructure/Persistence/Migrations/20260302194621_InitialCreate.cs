using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TindeqTrainer.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Protocols",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 150, nullable: false),
                    MaxWeightKg = table.Column<double>(type: "REAL", nullable: false),
                    WeightPercentage = table.Column<double>(type: "REAL", nullable: false),
                    SetsPerHand = table.Column<int>(type: "INTEGER", nullable: false),
                    WorkSeconds = table.Column<double>(type: "REAL", nullable: false),
                    RestSeconds = table.Column<double>(type: "REAL", nullable: false),
                    HandSwitchSeconds = table.Column<double>(type: "REAL", nullable: false),
                    CountdownSeconds = table.Column<double>(type: "REAL", nullable: false),
                    AudioCues = table.Column<bool>(type: "INTEGER", nullable: false),
                    CountdownBeeps = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsDefault = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Protocols", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Type = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    ProtocolId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ProtocolName = table.Column<string>(type: "TEXT", maxLength: 150, nullable: false),
                    IsComplete = table.Column<bool>(type: "INTEGER", nullable: false),
                    PeakForceKg = table.Column<double>(type: "REAL", nullable: false),
                    AvgForceKg = table.Column<double>(type: "REAL", nullable: false),
                    DurationSeconds = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sessions_Protocols_ProtocolId",
                        column: x => x.ProtocolId,
                        principalTable: "Protocols",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SessionSamples",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SessionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Hand = table.Column<string>(type: "TEXT", maxLength: 16, nullable: true),
                    SetNumber = table.Column<int>(type: "INTEGER", nullable: true),
                    WeightKg = table.Column<float>(type: "REAL", nullable: false),
                    TimestampSeconds = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionSamples", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionSamples_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Protocols",
                columns: new[] { "Id", "AudioCues", "CountdownBeeps", "CountdownSeconds", "HandSwitchSeconds", "IsDefault", "MaxWeightKg", "Name", "RestSeconds", "SetsPerHand", "WeightPercentage", "WorkSeconds" },
                values: new object[,]
                {
                    { new Guid("2cf4e16b-c3a7-4dfa-8944-b1d6b2384f89"), true, true, 5.0, 30.0, true, 0.0, "Endurance 60%", 3.0, 10, 60.0, 7.0 },
                    { new Guid("664101f7-7dcd-4fb4-94f5-61e7f80c6ef0"), true, true, 5.0, 30.0, true, 0.0, "Max Repeaters 80%", 3.0, 6, 80.0, 7.0 },
                    { new Guid("d53a3ea5-d9bf-43a6-8ff8-e8f7c7f07f0a"), true, true, 5.0, 30.0, true, 0.0, "Short Power 90%", 5.0, 4, 90.0, 5.0 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_ProtocolId",
                table: "Sessions",
                column: "ProtocolId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionSamples_SessionId",
                table: "SessionSamples",
                column: "SessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessionSamples");

            migrationBuilder.DropTable(
                name: "Sessions");

            migrationBuilder.DropTable(
                name: "Protocols");
        }
    }
}
