using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TindeqTrainer.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSessionTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessionSamples");

            migrationBuilder.DropTable(
                name: "Sessions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProtocolId = table.Column<Guid>(type: "TEXT", nullable: true),
                    AvgForceKg = table.Column<double>(type: "REAL", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DurationSeconds = table.Column<double>(type: "REAL", nullable: false),
                    IsComplete = table.Column<bool>(type: "INTEGER", nullable: false),
                    PeakForceKg = table.Column<double>(type: "REAL", nullable: false),
                    ProtocolName = table.Column<string>(type: "TEXT", maxLength: 150, nullable: false),
                    Type = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false)
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
                    TimestampSeconds = table.Column<double>(type: "REAL", nullable: false),
                    WeightKg = table.Column<float>(type: "REAL", nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_ProtocolId",
                table: "Sessions",
                column: "ProtocolId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionSamples_SessionId",
                table: "SessionSamples",
                column: "SessionId");
        }
    }
}
