using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceTicketSchedulingAndCertificate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "replacement_photo_url",
                table: "service_tickets",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "scheduled_visit_at",
                table: "service_tickets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "signed_by_name",
                table: "service_tickets",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "tested_generation_kw",
                table: "service_tickets",
                type: "numeric(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "replacement_photo_url",
                table: "service_tickets");

            migrationBuilder.DropColumn(
                name: "scheduled_visit_at",
                table: "service_tickets");

            migrationBuilder.DropColumn(
                name: "signed_by_name",
                table: "service_tickets");

            migrationBuilder.DropColumn(
                name: "tested_generation_kw",
                table: "service_tickets");
        }
    }
}
