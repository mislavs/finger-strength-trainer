using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TindeqTrainer.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMaxWeightRecordsAndRemoveProtocolMaxWeight : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxWeightKg",
                table: "Protocols");

            migrationBuilder.CreateTable(
                name: "MaxWeightRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Hand = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    WeightKg = table.Column<double>(type: "REAL", nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaxWeightRecords", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaxWeightRecords_Hand_RecordedAt",
                table: "MaxWeightRecords",
                columns: new[] { "Hand", "RecordedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MaxWeightRecords");

            migrationBuilder.AddColumn<double>(
                name: "MaxWeightKg",
                table: "Protocols",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);
        }
    }
}
