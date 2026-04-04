using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TindeqTrainer.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RenameProtocolsToRepeaterProtocols : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "Protocols",
                newName: "RepeaterProtocols");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "RepeaterProtocols",
                newName: "Protocols");
        }
    }
}
