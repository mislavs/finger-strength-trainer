using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TindeqTrainer.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveProtocolDefault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDefault",
                table: "Protocols");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDefault",
                table: "Protocols",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "Protocols",
                keyColumn: "Id",
                keyValue: new Guid("2cf4e16b-c3a7-4dfa-8944-b1d6b2384f89"),
                column: "IsDefault",
                value: true);

            migrationBuilder.UpdateData(
                table: "Protocols",
                keyColumn: "Id",
                keyValue: new Guid("664101f7-7dcd-4fb4-94f5-61e7f80c6ef0"),
                column: "IsDefault",
                value: true);

            migrationBuilder.UpdateData(
                table: "Protocols",
                keyColumn: "Id",
                keyValue: new Guid("d53a3ea5-d9bf-43a6-8ff8-e8f7c7f07f0a"),
                column: "IsDefault",
                value: true);
        }
    }
}
