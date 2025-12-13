using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApplicationFlytwo.Migrations
{
    /// <inheritdoc />
    public partial class AddPrintJobsOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PayloadJson = table.Column<string>(type: "text", nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ProcessedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    LockedUntilUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastAttemptAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastError = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PrintJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmpresaId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    ReportKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Format = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ParametersJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    StartedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProgressCurrent = table.Column<int>(type: "integer", nullable: true),
                    ProgressTotal = table.Column<int>(type: "integer", nullable: true),
                    LastProgressAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    OutputBucket = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    OutputKey = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    OutputUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    OutputExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ErrorMessage = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrintJobs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_LockedUntilUtc",
                table: "OutboxMessages",
                column: "LockedUntilUtc");

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_OccurredAtUtc",
                table: "OutboxMessages",
                column: "OccurredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_ProcessedAtUtc",
                table: "OutboxMessages",
                column: "ProcessedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_PrintJobs_CreatedByUserId_CreatedAtUtc",
                table: "PrintJobs",
                columns: new[] { "CreatedByUserId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PrintJobs_EmpresaId_CreatedAtUtc",
                table: "PrintJobs",
                columns: new[] { "EmpresaId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PrintJobs_Status",
                table: "PrintJobs",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OutboxMessages");

            migrationBuilder.DropTable(
                name: "PrintJobs");
        }
    }
}
