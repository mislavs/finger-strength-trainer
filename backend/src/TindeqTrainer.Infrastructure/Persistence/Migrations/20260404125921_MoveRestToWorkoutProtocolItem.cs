using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TindeqTrainer.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MoveRestToWorkoutProtocolItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RestBetweenSeconds",
                table: "WorkoutProtocols");

            migrationBuilder.AddColumn<double>(
                name: "RestAfterSeconds",
                table: "WorkoutProtocolItems",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RestAfterSeconds",
                table: "WorkoutProtocolItems");

            migrationBuilder.AddColumn<double>(
                name: "RestBetweenSeconds",
                table: "WorkoutProtocols",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);
        }
    }
}
