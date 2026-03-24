using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TindeqTrainer.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CombineMaxWeightHands : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "LeftWeightKg",
                table: "MaxWeightRecords",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "RightWeightKg",
                table: "MaxWeightRecords",
                type: "REAL",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "MaxWeightRecords"
                SET "LeftWeightKg" = "WeightKg"
                WHERE "Hand" = 'Left';
                """);

            migrationBuilder.Sql("""
                UPDATE "MaxWeightRecords"
                SET "RightWeightKg" = "WeightKg"
                WHERE "Hand" = 'Right';
                """);

            migrationBuilder.DropIndex(
                name: "IX_MaxWeightRecords_Hand_RecordedAt",
                table: "MaxWeightRecords");

            migrationBuilder.DropColumn(
                name: "Hand",
                table: "MaxWeightRecords");

            migrationBuilder.DropColumn(
                name: "WeightKg",
                table: "MaxWeightRecords");

            migrationBuilder.CreateIndex(
                name: "IX_MaxWeightRecords_RecordedAt",
                table: "MaxWeightRecords",
                column: "RecordedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MaxWeightRecords_RecordedAt",
                table: "MaxWeightRecords");

            migrationBuilder.DropColumn(
                name: "LeftWeightKg",
                table: "MaxWeightRecords");

            migrationBuilder.DropColumn(
                name: "RightWeightKg",
                table: "MaxWeightRecords");

            migrationBuilder.AddColumn<string>(
                name: "Hand",
                table: "MaxWeightRecords",
                type: "TEXT",
                maxLength: 16,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "WeightKg",
                table: "MaxWeightRecords",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.Sql("""
                UPDATE "MaxWeightRecords"
                SET
                    "Hand" = CASE
                        WHEN "LeftWeightKg" IS NOT NULL THEN 'Left'
                        WHEN "RightWeightKg" IS NOT NULL THEN 'Right'
                        ELSE 'Left'
                    END,
                    "WeightKg" = COALESCE("LeftWeightKg", "RightWeightKg", 0);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_MaxWeightRecords_Hand_RecordedAt",
                table: "MaxWeightRecords",
                columns: new[] { "Hand", "RecordedAt" });
        }
    }
}
