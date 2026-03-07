using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TindeqTrainer.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProtocolSetConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "SetsPerHand",
                table: "Protocols",
                newName: "RepsPerSet");

            migrationBuilder.AddColumn<int>(
                name: "NumberOfSets",
                table: "Protocols",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<double>(
                name: "SetRestSeconds",
                table: "Protocols",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.UpdateData(
                table: "Protocols",
                keyColumn: "Id",
                keyValue: new Guid("2cf4e16b-c3a7-4dfa-8944-b1d6b2384f89"),
                columns: new[] { "NumberOfSets", "SetRestSeconds" },
                values: new object[] { 1, 0.0 });

            migrationBuilder.UpdateData(
                table: "Protocols",
                keyColumn: "Id",
                keyValue: new Guid("664101f7-7dcd-4fb4-94f5-61e7f80c6ef0"),
                columns: new[] { "NumberOfSets", "SetRestSeconds" },
                values: new object[] { 1, 0.0 });

            migrationBuilder.UpdateData(
                table: "Protocols",
                keyColumn: "Id",
                keyValue: new Guid("d53a3ea5-d9bf-43a6-8ff8-e8f7c7f07f0a"),
                columns: new[] { "NumberOfSets", "SetRestSeconds" },
                values: new object[] { 1, 0.0 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NumberOfSets",
                table: "Protocols");

            migrationBuilder.DropColumn(
                name: "SetRestSeconds",
                table: "Protocols");

            migrationBuilder.RenameColumn(
                name: "RepsPerSet",
                table: "Protocols",
                newName: "SetsPerHand");
        }
    }
}
