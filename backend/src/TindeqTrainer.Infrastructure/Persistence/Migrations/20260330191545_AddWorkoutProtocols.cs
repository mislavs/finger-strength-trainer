using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TindeqTrainer.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutProtocols : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkoutProtocols",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 150, nullable: false),
                    RestBetweenSeconds = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutProtocols", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkoutProtocolItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    WorkoutProtocolId = table.Column<Guid>(type: "TEXT", nullable: false),
                    RepeaterProtocolId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    Repetitions = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutProtocolItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutProtocolItems_RepeaterProtocols_RepeaterProtocolId",
                        column: x => x.RepeaterProtocolId,
                        principalTable: "RepeaterProtocols",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkoutProtocolItems_WorkoutProtocols_WorkoutProtocolId",
                        column: x => x.WorkoutProtocolId,
                        principalTable: "WorkoutProtocols",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutProtocolItems_RepeaterProtocolId",
                table: "WorkoutProtocolItems",
                column: "RepeaterProtocolId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutProtocolItems_WorkoutProtocolId_SortOrder",
                table: "WorkoutProtocolItems",
                columns: new[] { "WorkoutProtocolId", "SortOrder" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkoutProtocolItems");

            migrationBuilder.DropTable(
                name: "WorkoutProtocols");
        }
    }
}
